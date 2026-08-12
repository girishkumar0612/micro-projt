"""
Version-aware query intent detector.

Classifies a free-text question into one of four modes and extracts any
explicitly mentioned version strings.  Pure functions — no I/O, no DB, no
network calls.  Everything here is deterministic and unit-testable in
isolation.

QueryIntent.mode values
-----------------------
NORMAL          No version mentioned → retrieve ONLY the current/latest version.
EXPLICIT        One or more specific versions mentioned ("v1.0", "version 2") →
                retrieve exactly those versions.
COMPARISON      User asks to compare two or more versions, or uses "changed
                between", "differences between", etc. → retrieve all explicitly
                named versions (or current + previous for "latest version" phrasing).
LATEST_COMPARE  User asks what changed "in the latest version" / "from the
                previous version" without naming versions → retrieve current
                version AND the immediately previous version.

Version string normalisation
-----------------------------
All extracted version strings are normalised to lowercase, e.g.:
    "V2.0", "version 2.0", "ver 2", "v2", "2.0" → "2.0"
    "v1", "version 1", "1.0"                     → "1.0"  (minor added when absent)

This normalised form is matched against filenames in version_filter.py.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum


class IntentMode(str, Enum):
    NORMAL         = "normal"
    EXPLICIT       = "explicit"
    COMPARISON     = "comparison"
    LATEST_COMPARE = "latest_compare"


@dataclass(frozen=True)
class QueryIntent:
    mode: IntentMode
    # Normalised version strings extracted from the query, e.g. ["1.0", "2.0"]
    # Empty for NORMAL and LATEST_COMPARE.
    requested_versions: tuple[str, ...] = field(default_factory=tuple)

    def __repr__(self) -> str:
        return f"QueryIntent(mode={self.mode.value!r}, versions={list(self.requested_versions)})"


# ---------------------------------------------------------------------------
# Regex patterns — compiled once at module import
# ---------------------------------------------------------------------------

# Matches:  v1  v1.0  v2.3  v10  version 1  version 1.0  ver 1  1.0  2.0
# Group "major": integer part; Group "minor": optional decimal part
_VERSION_PAT = re.compile(
    r"\b(?:version|ver|v)\.?\s*(\d+)(?:\.(\d+))?\b"
    r"|"
    r"\b(\d+)\.(\d+)\b",          # bare "1.0", "2.0" — must include decimal
    re.IGNORECASE,
)

# Phrases that signal a comparison between two things
_COMPARISON_PHRASES = re.compile(
    r"""
    \b(?:
        (?:what|what's|whats)\s+(?:changed?|different|updated?|new|differs?)
        \s+(?:between|from|in)
    |   (?:diff(?:erence)?s?|changes?|updates?)\s+between
    |   compare\s+(?:v(?:ersion)?s?\s*)?\d        # "compare v1 and v2"
    |   comparing\s+(?:v(?:ersion)?s?\s*)?\d
    |   between\s+v(?:ersion)?\s*\d               # "between v1.0 and v2.0"
    |   from\s+v(?:ersion)?\s*\d+\s+to\s+v(?:ersion)?\s*\d   # "from v1 to v2"
    |   v(?:ersion)?\s*\d[^\n]*\s+(?:and|vs\.?|versus)\s+v(?:ersion)?\s*\d
    )\b
    """,
    re.IGNORECASE | re.VERBOSE,
)

# Phrases that mean "what changed in the newest version compared to the previous"
_LATEST_COMPARE_PHRASES = re.compile(
    r"""
    \b(?:
        (?:what|what's|whats)\s+(?:changed?|updated?|new|different|added?|removed?|modified?)
        \s+in\s+(?:the\s+)?(?:latest|newest|current|most\s+recent)\s+version
    |   (?:what|what's|whats)\s+is\s+new\s+in\s+(?:the\s+)?
        (?:latest|newest|current|most\s+recent)\s+version
    |   (?:latest|newest|current|most\s+recent)\s+version\s+
        (?:changes?|updates?|differences?|improvements?)
    |   (?:changed?|updated?|modified?)\s+(?:from|since)\s+(?:the\s+)?
        (?:previous|last|old(?:er)?|prior)\s+version
    |   (?:previous|last|old(?:er)?|prior)\s+(?:to\s+)?(?:the\s+)?
        (?:latest|newest|current)\s+version
    |   (?:what|what's|whats)\s+(?:was\s+)?(?:changed?|updated?|new)\s+
        (?:from\s+)?(?:the\s+)?(?:previous|last)\s+(?:version|release)
    )\b
    """,
    re.IGNORECASE | re.VERBOSE,
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_versions(text: str) -> list[str]:
    """
    Extract and normalise all version strings from *text*.
    Returns a deduplicated, order-preserving list of strings like "1.0", "2.0".
    """
    seen: dict[str, None] = {}   # ordered set via insertion-order dict
    for m in _VERSION_PAT.finditer(text):
        if m.group(1) is not None:
            # Matched "v1", "v1.0", "version 1.0" etc.
            major = m.group(1)
            minor = m.group(2) if m.group(2) is not None else "0"
        else:
            # Matched bare "1.0"
            major = m.group(3)
            minor = m.group(4)
        normalised = f"{major}.{minor}"
        seen[normalised] = None
    return list(seen.keys())


def _is_comparison_query(text: str) -> bool:
    return bool(_COMPARISON_PHRASES.search(text))


def _is_latest_compare_query(text: str) -> bool:
    return bool(_LATEST_COMPARE_PHRASES.search(text))


def _has_explicit_version(text: str) -> bool:
    return bool(_VERSION_PAT.search(text))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_intent(question: str) -> QueryIntent:
    """
    Classify *question* into a QueryIntent.

    Decision tree (in priority order):
    1. LATEST_COMPARE  — "what changed in the latest version" (no specific version
                         numbers needed; version numbers are irrelevant here because
                         the filter resolves current + previous from the DB).
    2. COMPARISON      — explicit version numbers + comparison phrasing, OR
                         two or more different version numbers with any comparison
                         indicator word ("between", "vs", "and", "compare").
    3. EXPLICIT        — one or more specific version numbers without comparison
                         phrasing ("in v1.0", "for version 2").
    4. NORMAL          — no version signal at all.
    """
    q = question.strip()

    # ── Priority 1: "what changed in the latest version" style ──────────────
    if _is_latest_compare_query(q):
        return QueryIntent(mode=IntentMode.LATEST_COMPARE)

    versions = _extract_versions(q)

    # ── Priority 2: explicit comparison between named versions ───────────────
    if _is_comparison_query(q) and versions:
        return QueryIntent(
            mode=IntentMode.COMPARISON,
            requested_versions=tuple(versions),
        )

    # Also treat "two or more different version numbers" as a comparison even
    # without explicit comparison phrasing (e.g. "v1.0 vs v2.0 differences")
    if len(versions) >= 2:
        # Any of these connective words between the versions = comparison
        connectives = re.compile(r"\b(vs\.?|versus|and|or|between|compare)\b", re.I)
        if connectives.search(q):
            return QueryIntent(
                mode=IntentMode.COMPARISON,
                requested_versions=tuple(versions),
            )

    # ── Priority 3: explicit single version reference ────────────────────────
    if versions:
        return QueryIntent(
            mode=IntentMode.EXPLICIT,
            requested_versions=tuple(versions),
        )

    # ── Priority 4: normal query — retrieve latest version only ─────────────
    return QueryIntent(mode=IntentMode.NORMAL)
