"""
Version-aware document ID filter.

Takes the RBAC-approved document ID set and a QueryIntent, then narrows it
further so that FAISS only sees chunks from the appropriate policy version(s).

Design constraints
------------------
* RBAC is NEVER weakened.  This module only INTERSECTS with allowed_doc_ids;
  it never adds documents that RBAC excluded.
* If the version filter would produce an empty set (e.g. the user asks for
  v3.0 but it hasn't been uploaded, or RBAC denied all versions), the
  caller receives an empty list — which chat_service already handles by
  raising AccessRestrictedError or NoDocumentsIndexedError as appropriate.
* No I/O and no embedding calls happen here.

Version detection from filenames
---------------------------------
We parse version strings directly from Document.filename because that is the
only version signal available without extra DB columns.  The parsing is
intentionally lenient to handle real-world naming conventions:

    TechNova_IT_Security_Policy.pdf        → version "1.0" (no tag = v1, legacy)
    TechNova_IT_Security_Policy_v1.0.pdf   → version "1.0"
    TechNova_IT_Security_Policy_v2.0.pdf   → version "2.0"
    TechNova_HR_Policy.pdf                 → version "1.0" (only one version → latest)

A document WITHOUT an explicit version tag is treated as version "1.0" only
when other documents with the SAME policy name exist that DO carry version
tags.  If a policy name is unique (only one document), it is always "latest"
regardless of whether it carries a tag.

Policy family grouping
----------------------
Two documents belong to the same "family" when their canonical name — the
filename after stripping version suffixes, common suffixes like "_FINAL", and
the .pdf extension — is identical (case-insensitive).

    TechNova_IT_Security_Policy.pdf      → canonical "technova_it_security_policy"
    TechNova_IT_Security_Policy_v2.0.pdf → canonical "technova_it_security_policy"

These form a family; "latest" = highest version; "previous" = second-highest.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from app.rag.version_detector import QueryIntent, IntentMode
from app.utils.logger import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class PolicyVersion:
    doc_id: str
    filename: str
    version: str          # normalised "major.minor", e.g. "1.0", "2.0"
    version_tuple: tuple  # (major_int, minor_int) for sorting


@dataclass
class PolicyFamily:
    canonical_name: str
    versions: list[PolicyVersion]   # sorted ascending by version_tuple


# ---------------------------------------------------------------------------
# Filename parsing helpers
# ---------------------------------------------------------------------------

# Pattern that matches version tags inside filenames, e.g.
#   _v1, _v1.0, _v2.3, _version1, _version_1.0, _V2.0
_FNAME_VERSION_PAT = re.compile(
    r"[_\-\s]v(?:ersion[_\-\s]?)?(\d+)(?:[._](\d+))?",
    re.IGNORECASE,
)

# Trailing noise to strip before computing canonical name
_STRIP_SUFFIXES = re.compile(
    r"(_final|_draft|_approved|_signed|_updated|_revised|_v\d[\d._]*)?\.pdf$",
    re.IGNORECASE,
)


def _parse_version_from_filename(filename: str) -> str | None:
    """
    Extract the version string from a filename.
    Returns None if no version tag is found.

    Examples:
        "TechNova_IT_Security_Policy_v2.0.pdf" → "2.0"
        "TechNova_IT_Security_Policy.pdf"       → None
        "HR_Policy_V1.0_FINAL.pdf"              → "1.0"
    """
    m = _FNAME_VERSION_PAT.search(filename)
    if not m:
        return None
    major = m.group(1)
    minor = m.group(2) if m.group(2) is not None else "0"
    return f"{major}.{minor}"


def _canonical_name(filename: str) -> str:
    """
    Strip the version tag, common noise suffixes, and .pdf extension to
    obtain a stable family identifier.

    Examples:
        "TechNova_IT_Security_Policy_v2.0.pdf" → "technova_it_security_policy"
        "TechNova_IT_Security_Policy.pdf"       → "technova_it_security_policy"
        "HR_Policy_V1_FINAL.pdf"                → "hr_policy"
    """
    # First strip known trailing suffixes (including _vX.Y.pdf)
    name = _STRIP_SUFFIXES.sub("", filename)
    # Also strip any remaining _vX or _vX.Y not caught above
    name = re.sub(r"[_\-]v(?:ersion[_\-]?)?[\d._]+$", "", name, flags=re.IGNORECASE)
    # Strip generic trailing noise words
    name = re.sub(r"[_\-](?:final|draft|approved|signed|updated|revised)$", "", name, flags=re.IGNORECASE)
    return name.lower().rstrip("_-")


def _version_tuple(v: str) -> tuple[int, int]:
    """"2.0" → (2, 0);  "1.0" → (1, 0)"""
    parts = v.split(".", 1)
    try:
        return (int(parts[0]), int(parts[1]) if len(parts) > 1 else 0)
    except ValueError:
        return (0, 0)


# ---------------------------------------------------------------------------
# Family builder
# ---------------------------------------------------------------------------

def _build_families(
    doc_ids_pool: set[str],
    all_docs: list,   # list[Document] — we only read .id and .filename
) -> dict[str, PolicyFamily]:
    """
    Group documents in *doc_ids_pool* into policy families by canonical name.

    Documents whose filenames carry no explicit version tag are assigned
    version "1.0" ONLY when another document in the same family DOES carry
    a version tag (making this the "legacy" v1).  If no siblings have version
    tags, the document is treated as the sole version of that policy and will
    always be "latest".
    """
    # First pass: collect per canonical-name buckets
    buckets: dict[str, list[PolicyVersion]] = {}
    for doc in all_docs:
        if doc.id not in doc_ids_pool:
            continue
        canon  = _canonical_name(doc.filename)
        parsed = _parse_version_from_filename(doc.filename)
        # Assign a provisional "unversioned" marker; will be resolved below
        ver = parsed  # may be None
        pv  = PolicyVersion(
            doc_id=doc.id,
            filename=doc.filename,
            version=ver or "",  # placeholder
            version_tuple=(0, 0),
        )
        buckets.setdefault(canon, []).append(pv)

    # Second pass: within each family, decide the version for untagged docs
    families: dict[str, PolicyFamily] = {}
    for canon, pvlist in buckets.items():
        tagged   = [pv for pv in pvlist if _parse_version_from_filename(pv.filename)]
        untagged = [pv for pv in pvlist if not _parse_version_from_filename(pv.filename)]

        for pv in tagged:
            ver = _parse_version_from_filename(pv.filename)
            pv.version       = ver
            pv.version_tuple = _version_tuple(ver)

        for pv in untagged:
            if tagged:
                # Treat as implicit v1.0 (the "legacy" version predating tags)
                pv.version       = "1.0"
                pv.version_tuple = (1, 0)
            else:
                # Sole version — mark as 1.0 so it's always "latest"
                pv.version       = "1.0"
                pv.version_tuple = (1, 0)

        # Sort ascending so [-1] = latest, [-2] = previous
        pvlist.sort(key=lambda x: x.version_tuple)
        families[canon] = PolicyFamily(canonical_name=canon, versions=pvlist)

    return families


# ---------------------------------------------------------------------------
# The public filter
# ---------------------------------------------------------------------------

def apply_version_filter(
    allowed_doc_ids: list[str] | None,
    all_docs: list,                    # list[Document] from DB
    intent: QueryIntent,
) -> list[str] | None:
    """
    Given the RBAC-filtered document IDs and the detected QueryIntent, return
    a further-filtered list of doc IDs for FAISS.

    Semantics per mode:
      NORMAL         → per policy family, keep ONLY the latest version.
      EXPLICIT       → keep ONLY docs whose version matches one of the
                       requested_versions.
      COMPARISON     → keep docs whose version is in requested_versions
                       (all of them, so LLM can compare).
      LATEST_COMPARE → per policy family keep the latest + the previous version
                       (if only one version exists, keep it).

    Return value:
      None  — admin path (no filter applied, pass None through to FAISS).
      list  — filtered list of doc IDs (may be empty; caller handles that).

    RBAC guarantee:
      This function may only REMOVE items from allowed_doc_ids, never ADD.
      The final set is always a subset of (or equal to) the incoming set.
    """
    # Admin: unrestricted — no version filter either
    if allowed_doc_ids is None:
        if intent.mode == IntentMode.NORMAL:
            # Even admin gets "latest only" for normal queries to avoid
            # surfacing stale versions in everyday answers.
            allowed_doc_ids = [doc.id for doc in all_docs if doc.status == "ready"]
            # Fall through to version filtering below with the full set
        else:
            # For explicit/comparison queries admin sees everything they ask for
            return None

    if not allowed_doc_ids:
        return []

    pool = set(allowed_doc_ids)
    families = _build_families(pool, all_docs)

    if intent.mode == IntentMode.NORMAL:
        return _filter_latest_only(families)

    if intent.mode == IntentMode.EXPLICIT:
        return _filter_explicit(families, list(intent.requested_versions))

    if intent.mode == IntentMode.COMPARISON:
        return _filter_explicit(families, list(intent.requested_versions))

    if intent.mode == IntentMode.LATEST_COMPARE:
        return _filter_latest_and_previous(families)

    # Fallback — should never reach here
    return list(pool)


# ---------------------------------------------------------------------------
# Mode-specific helpers
# ---------------------------------------------------------------------------

def _filter_latest_only(families: dict[str, PolicyFamily]) -> list[str]:
    """Return only the highest-version document from each policy family."""
    result = []
    for family in families.values():
        if family.versions:
            result.append(family.versions[-1].doc_id)   # highest version
    logger.debug(f"version_filter NORMAL → {len(result)} doc(s) (latest only)")
    return result


def _filter_latest_and_previous(families: dict[str, PolicyFamily]) -> list[str]:
    """Return the latest AND the immediately preceding version of each family."""
    result = []
    for family in families.values():
        if len(family.versions) >= 2:
            result.append(family.versions[-1].doc_id)   # latest
            result.append(family.versions[-2].doc_id)   # previous
        elif family.versions:
            result.append(family.versions[-1].doc_id)   # only version
    logger.debug(f"version_filter LATEST_COMPARE → {len(result)} doc(s)")
    return result


def _filter_explicit(
    families: dict[str, PolicyFamily],
    requested: list[str],
) -> list[str]:
    """
    Return only documents whose version is in *requested*.
    Matching is done on the normalised version string (e.g. "1.0", "2.0").
    Docs in families with no version overlap are dropped.
    """
    requested_set = set(requested)
    result = []
    for family in families.values():
        for pv in family.versions:
            if pv.version in requested_set:
                result.append(pv.doc_id)
    logger.debug(
        f"version_filter EXPLICIT/COMPARISON (wanted {requested_set}) → "
        f"{len(result)} doc(s)"
    )
    return result
