"""
Tests for version-aware query intent detection and retrieval filtering.

Covers all 7 required test cases (A–G) plus detailed unit tests for the
detector and filter in isolation.  No live LLM, no FAISS, no DB required —
the vectorstore boundary is mocked.

Run with:
    cd backend
    python -m pytest tests/test_version_aware.py -v
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from unittest.mock import patch, MagicMock
from types import SimpleNamespace

# ── modules under test ────────────────────────────────────────────────────────
from app.rag.version_detector import detect_intent, IntentMode, QueryIntent
from app.rag.version_filter   import (
    apply_version_filter,
    _canonical_name,
    _parse_version_from_filename,
    _build_families,
)
from app.services.chat_service import ask_question
from app.utils.exceptions import AccessRestrictedError


# ── helpers ───────────────────────────────────────────────────────────────────

def _doc(doc_id, filename, status="ready"):
    """Minimal stand-in for a Document ORM row."""
    return SimpleNamespace(id=doc_id, filename=filename, status=status)


# Two IT Security Policy docs that mirror the real uploaded files
IT_V1 = _doc("fb99c2c330b0", "TechNova_IT_Security_Policy.pdf")       # implicit v1.0
IT_V2 = _doc("db5b93f6cc10", "TechNova_IT_Security_Policy_v2.0.pdf")  # explicit v2.0
HR    = _doc("01e8458a2bf9", "TechNova_HR_Policy.pdf")
FIN   = _doc("39c22d9c0a1b", "TechNova_Finance_Accounting_Policy.pdf")

ALL_DOCS = [IT_V1, IT_V2, HR, FIN]

IT_ALLOWED   = [IT_V1.id, IT_V2.id]   # what the IT role sees after RBAC
IT_HR_DENIED = []                      # Finance role sees no IT docs after RBAC


# =============================================================================
# Part 1 — version_detector unit tests
# =============================================================================

class TestDetectIntentNormal:
    def test_plain_question(self):
        i = detect_intent("What is the minimum password length?")
        assert i.mode == IntentMode.NORMAL

    def test_general_policy_question(self):
        i = detect_intent("What is the remote work policy?")
        assert i.mode == IntentMode.NORMAL

    def test_no_version_at_all(self):
        i = detect_intent("How many vacation days do I get?")
        assert i.mode == IntentMode.NORMAL


class TestDetectIntentExplicit:
    def test_v1_lowercase(self):
        i = detect_intent("What was the password length in v1.0?")
        assert i.mode == IntentMode.EXPLICIT
        assert "1.0" in i.requested_versions

    def test_v2_explicit(self):
        i = detect_intent("What is the minimum password length in version 2.0?")
        assert i.mode == IntentMode.EXPLICIT
        assert "2.0" in i.requested_versions

    def test_v2_short(self):
        i = detect_intent("What does v2 say about password rotation?")
        assert i.mode == IntentMode.EXPLICIT
        assert "2.0" in i.requested_versions

    def test_version_word(self):
        i = detect_intent("What was the policy in version 1?")
        assert i.mode == IntentMode.EXPLICIT
        assert "1.0" in i.requested_versions


class TestDetectIntentComparison:
    def test_between_v1_and_v2(self):
        i = detect_intent(
            "What changed in the password requirements between "
            "IT Security Policy v1.0 and v2.0?"
        )
        assert i.mode == IntentMode.COMPARISON
        assert "1.0" in i.requested_versions
        assert "2.0" in i.requested_versions

    def test_compare_phrasing(self):
        i = detect_intent("Compare v1.0 and v2.0 of the IT security policy.")
        assert i.mode == IntentMode.COMPARISON
        assert "1.0" in i.requested_versions
        assert "2.0" in i.requested_versions

    def test_differences_between(self):
        i = detect_intent("What are the differences between v1.0 and v2.0?")
        assert i.mode == IntentMode.COMPARISON

    def test_vs_phrasing(self):
        i = detect_intent("IT Security Policy v1.0 vs v2.0 — what changed?")
        assert i.mode == IntentMode.COMPARISON

    def test_from_to_phrasing(self):
        i = detect_intent("What changed from v1.0 to v2.0?")
        assert i.mode == IntentMode.COMPARISON


class TestDetectIntentLatestCompare:
    def test_what_changed_in_latest(self):
        i = detect_intent("What changed in the latest version?")
        assert i.mode == IntentMode.LATEST_COMPARE

    def test_what_is_new_in_current_version(self):
        i = detect_intent("What is new in the current version?")
        assert i.mode == IntentMode.LATEST_COMPARE

    def test_changed_from_previous(self):
        i = detect_intent("What was changed from the previous version?")
        assert i.mode == IntentMode.LATEST_COMPARE

    def test_most_recent_version_changes(self):
        i = detect_intent("What are the latest version changes?")
        assert i.mode == IntentMode.LATEST_COMPARE


# =============================================================================
# Part 2 — version_filter unit tests
# =============================================================================

class TestCanonicalName:
    def test_no_version_tag(self):
        assert _canonical_name("TechNova_IT_Security_Policy.pdf") \
            == "technova_it_security_policy"

    def test_v2_tag(self):
        assert _canonical_name("TechNova_IT_Security_Policy_v2.0.pdf") \
            == "technova_it_security_policy"

    def test_v1_tag(self):
        assert _canonical_name("TechNova_IT_Security_Policy_v1.0.pdf") \
            == "technova_it_security_policy"

    def test_same_family(self):
        assert (
            _canonical_name("TechNova_IT_Security_Policy.pdf")
            == _canonical_name("TechNova_IT_Security_Policy_v2.0.pdf")
        )

    def test_different_policy(self):
        assert (
            _canonical_name("TechNova_HR_Policy.pdf")
            != _canonical_name("TechNova_IT_Security_Policy.pdf")
        )


class TestParseVersionFromFilename:
    def test_no_tag_returns_none(self):
        assert _parse_version_from_filename("TechNova_IT_Security_Policy.pdf") is None

    def test_v2_tag(self):
        assert _parse_version_from_filename("TechNova_IT_Security_Policy_v2.0.pdf") == "2.0"

    def test_v1_tag(self):
        assert _parse_version_from_filename("Policy_v1.0.pdf") == "1.0"

    def test_uppercase_v(self):
        assert _parse_version_from_filename("Policy_V2.pdf") == "2.0"

    def test_no_minor(self):
        assert _parse_version_from_filename("Policy_v3.pdf") == "3.0"


class TestBuildFamilies:
    def test_two_it_versions_form_one_family(self):
        pool = {IT_V1.id, IT_V2.id}
        families = _build_families(pool, ALL_DOCS)
        # Both IT docs should be in a single family
        assert len(families) == 1
        fam = list(families.values())[0]
        assert len(fam.versions) == 2

    def test_untagged_gets_implicit_v1(self):
        pool = {IT_V1.id, IT_V2.id}
        families = _build_families(pool, ALL_DOCS)
        fam = list(families.values())[0]
        versions_map = {pv.doc_id: pv.version for pv in fam.versions}
        assert versions_map[IT_V1.id] == "1.0"
        assert versions_map[IT_V2.id] == "2.0"

    def test_latest_is_last_in_sorted_list(self):
        pool = {IT_V1.id, IT_V2.id}
        families = _build_families(pool, ALL_DOCS)
        fam = list(families.values())[0]
        assert fam.versions[-1].doc_id == IT_V2.id   # v2.0 is latest

    def test_sole_doc_always_latest(self):
        pool = {HR.id}
        families = _build_families(pool, ALL_DOCS)
        fam = list(families.values())[0]
        assert len(fam.versions) == 1
        assert fam.versions[0].doc_id == HR.id
        assert fam.versions[0].version == "1.0"


class TestApplyVersionFilter:
    # ── NORMAL ────────────────────────────────────────────────────────────────

    def test_normal_returns_latest_only(self):
        intent = QueryIntent(mode=IntentMode.NORMAL)
        result = apply_version_filter(IT_ALLOWED, ALL_DOCS, intent)
        assert IT_V2.id in result,  "v2.0 (latest) must be included"
        assert IT_V1.id not in result, "v1.0 (old) must be excluded for NORMAL query"

    def test_normal_single_version_policy_returns_it(self):
        intent = QueryIntent(mode=IntentMode.NORMAL)
        result = apply_version_filter([HR.id], ALL_DOCS, intent)
        assert HR.id in result

    # ── EXPLICIT ──────────────────────────────────────────────────────────────

    def test_explicit_v1_returns_v1_only(self):
        intent = QueryIntent(mode=IntentMode.EXPLICIT, requested_versions=("1.0",))
        result = apply_version_filter(IT_ALLOWED, ALL_DOCS, intent)
        assert IT_V1.id in result,      "v1.0 must be returned for explicit v1.0 query"
        assert IT_V2.id not in result,  "v2.0 must NOT be returned for explicit v1.0 query"

    def test_explicit_v2_returns_v2_only(self):
        intent = QueryIntent(mode=IntentMode.EXPLICIT, requested_versions=("2.0",))
        result = apply_version_filter(IT_ALLOWED, ALL_DOCS, intent)
        assert IT_V2.id in result
        assert IT_V1.id not in result

    def test_explicit_nonexistent_version_returns_empty(self):
        intent = QueryIntent(mode=IntentMode.EXPLICIT, requested_versions=("9.0",))
        result = apply_version_filter(IT_ALLOWED, ALL_DOCS, intent)
        assert result == []

    # ── COMPARISON ────────────────────────────────────────────────────────────

    def test_comparison_returns_both_versions(self):
        intent = QueryIntent(
            mode=IntentMode.COMPARISON, requested_versions=("1.0", "2.0")
        )
        result = apply_version_filter(IT_ALLOWED, ALL_DOCS, intent)
        assert IT_V1.id in result, "v1.0 must be included for comparison query"
        assert IT_V2.id in result, "v2.0 must be included for comparison query"

    # ── LATEST_COMPARE ────────────────────────────────────────────────────────

    def test_latest_compare_returns_latest_and_previous(self):
        intent = QueryIntent(mode=IntentMode.LATEST_COMPARE)
        result = apply_version_filter(IT_ALLOWED, ALL_DOCS, intent)
        assert IT_V1.id in result, "Previous version must be included"
        assert IT_V2.id in result, "Latest version must be included"

    def test_latest_compare_single_version_returns_it(self):
        intent = QueryIntent(mode=IntentMode.LATEST_COMPARE)
        result = apply_version_filter([HR.id], ALL_DOCS, intent)
        assert HR.id in result

    # ── RBAC enforcement ──────────────────────────────────────────────────────

    def test_rbac_empty_returns_empty_for_any_intent(self):
        for mode in IntentMode:
            intent = QueryIntent(mode=mode)
            result = apply_version_filter([], ALL_DOCS, intent)
            assert result == [], f"Expected [] for mode={mode} when RBAC denies all"

    def test_rbac_denied_v1_cannot_be_unlocked_by_explicit_request(self):
        """RBAC only allows v2 → asking for v1 explicitly must still return []."""
        intent = QueryIntent(mode=IntentMode.EXPLICIT, requested_versions=("1.0",))
        # Simulate role that can only see v2.0 (v1.0 is not in allowed set)
        result = apply_version_filter([IT_V2.id], ALL_DOCS, intent)
        assert IT_V1.id not in result, "RBAC must prevent access to excluded version"

    def test_filter_never_adds_docs_outside_rbac(self):
        """Comparison query: even though user asks for both versions, RBAC only
        allows v2.0 → v1.0 must not appear in the result."""
        intent = QueryIntent(
            mode=IntentMode.COMPARISON, requested_versions=("1.0", "2.0")
        )
        result = apply_version_filter([IT_V2.id], ALL_DOCS, intent)
        assert IT_V2.id in result
        assert IT_V1.id not in result


# =============================================================================
# Part 3 — Integration tests: ask_question with mocked FAISS and LLM
# =============================================================================

# Fake chunks returned by the mocked vectorstore
_CHUNK_V1 = {"text": "Password min: 12 chars (v1.0)", "score": 0.9,
             "source": "TechNova_IT_Security_Policy.pdf",       "page": 3}
_CHUNK_V2 = {"text": "Password min: 16 chars (v2.0)", "score": 0.95,
             "source": "TechNova_IT_Security_Policy_v2.0.pdf",  "page": 4}
_BOTH     = [_CHUNK_V1, _CHUNK_V2]
_V2_ONLY  = [_CHUNK_V2]
_V1_ONLY  = [_CHUNK_V1]


def _mock_ask(question, allowed_doc_ids, all_docs, mock_chunks):
    """
    Helper: run ask_question with mocked vectorstore and LLM.
    Returns (answer_text, sources_used, filtered_ids_passed_to_faiss).
    """
    captured = {}

    def fake_is_ready():  return True
    def fake_count():     return 10

    def fake_similarity_search_filtered(query, doc_ids, k=None):
        captured["doc_ids"] = list(doc_ids) if doc_ids is not None else None
        return mock_chunks

    def fake_similarity_search(query, k=None):
        captured["doc_ids"] = None
        return mock_chunks

    def fake_generate_answer(question, chunks):
        return "MOCKED: " + " | ".join(c["text"] for c in chunks)

    with patch("app.services.chat_service.vectorstore.is_ready",              fake_is_ready), \
         patch("app.services.chat_service.vectorstore.count",                 fake_count), \
         patch("app.services.chat_service.vectorstore.similarity_search_filtered",
               fake_similarity_search_filtered), \
         patch("app.services.chat_service.vectorstore.similarity_search",     fake_similarity_search), \
         patch("app.services.chat_service.generate_answer",                   fake_generate_answer):
        response = ask_question(question, allowed_doc_ids=allowed_doc_ids, all_docs=all_docs)

    return response, captured.get("doc_ids")


class TestRequiredCases:
    """
    Test cases A–G from the requirements.
    All assertions check WHICH doc IDs are passed to FAISS, not LLM output,
    because the LLM is mocked.  The retrieval filter is the behaviour under test.
    """

    # ── Case A ────────────────────────────────────────────────────────────────
    def test_A_normal_query_retrieves_v2_only(self):
        """Normal query → only v2.0 doc ID reaches FAISS."""
        response, doc_ids = _mock_ask(
            "What is the minimum password length?",
            allowed_doc_ids=IT_ALLOWED,
            all_docs=ALL_DOCS,
            mock_chunks=_V2_ONLY,
        )
        assert IT_V2.id in doc_ids,    "v2.0 must be in FAISS set for normal query"
        assert IT_V1.id not in doc_ids,"v1.0 must NOT be in FAISS set for normal query"

    # ── Case B ────────────────────────────────────────────────────────────────
    def test_B_explicit_v1_query_retrieves_v1_only(self):
        """Asking for v1.0 explicitly → only v1.0 doc ID reaches FAISS."""
        response, doc_ids = _mock_ask(
            "What was the minimum password length in v1.0?",
            allowed_doc_ids=IT_ALLOWED,
            all_docs=ALL_DOCS,
            mock_chunks=_V1_ONLY,
        )
        assert IT_V1.id in doc_ids,    "v1.0 must be in FAISS set"
        assert IT_V2.id not in doc_ids,"v2.0 must NOT be in FAISS set"

    # ── Case C ────────────────────────────────────────────────────────────────
    def test_C_explicit_v2_query_retrieves_v2_only(self):
        """Asking for v2.0 explicitly → only v2.0 doc ID reaches FAISS."""
        response, doc_ids = _mock_ask(
            "What is the minimum password length in version 2.0?",
            allowed_doc_ids=IT_ALLOWED,
            all_docs=ALL_DOCS,
            mock_chunks=_V2_ONLY,
        )
        assert IT_V2.id in doc_ids
        assert IT_V1.id not in doc_ids

    # ── Case D ────────────────────────────────────────────────────────────────
    def test_D_comparison_query_retrieves_both_versions(self):
        """Comparison query → BOTH v1.0 and v2.0 doc IDs reach FAISS."""
        response, doc_ids = _mock_ask(
            "What changed in the password requirements between "
            "IT Security Policy v1.0 and v2.0?",
            allowed_doc_ids=IT_ALLOWED,
            all_docs=ALL_DOCS,
            mock_chunks=_BOTH,
        )
        assert IT_V1.id in doc_ids, "v1.0 must be in FAISS set for comparison"
        assert IT_V2.id in doc_ids, "v2.0 must be in FAISS set for comparison"

    # ── Case E ────────────────────────────────────────────────────────────────
    def test_E_latest_version_query_retrieves_both(self):
        """'What changed in the latest version' → current + previous reach FAISS."""
        response, doc_ids = _mock_ask(
            "What changed in the latest version?",
            allowed_doc_ids=IT_ALLOWED,
            all_docs=ALL_DOCS,
            mock_chunks=_BOTH,
        )
        assert IT_V1.id in doc_ids, "Previous version must be in FAISS set"
        assert IT_V2.id in doc_ids, "Latest version must be in FAISS set"

    # ── Case F ────────────────────────────────────────────────────────────────
    def test_F_rbac_denial_for_unauthorized_role(self):
        """Finance role has no IT docs → asking about IT v1/v2 raises AccessRestrictedError."""
        with pytest.raises(AccessRestrictedError):
            _mock_ask(
                "What changed between IT Security Policy v1.0 and v2.0?",
                allowed_doc_ids=IT_HR_DENIED,   # empty — RBAC blocked all IT docs
                all_docs=ALL_DOCS,
                mock_chunks=[],                  # FAISS returns nothing
            )

    # ── Case G ────────────────────────────────────────────────────────────────
    def test_G_normal_query_never_retrieves_inactive_versions(self):
        """For ANY normal query, v1.0 doc ID must NOT be in the FAISS call."""
        normal_questions = [
            "What is the password policy?",
            "What are the IT security requirements?",
            "How often must passwords be rotated?",
        ]
        for q in normal_questions:
            _, doc_ids = _mock_ask(
                q,
                allowed_doc_ids=IT_ALLOWED,
                all_docs=ALL_DOCS,
                mock_chunks=_V2_ONLY,
            )
            assert IT_V1.id not in doc_ids, (
                f"Normal query {q!r} must not retrieve old version v1.0"
            )
            assert IT_V2.id in doc_ids, (
                f"Normal query {q!r} must retrieve current version v2.0"
            )


# =============================================================================
# Part 4 — Edge cases
# =============================================================================

class TestEdgeCases:
    def test_single_version_policy_unaffected_by_normal_filter(self):
        """A policy with only one version is always returned for NORMAL queries."""
        intent = QueryIntent(mode=IntentMode.NORMAL)
        result = apply_version_filter([HR.id, FIN.id], ALL_DOCS, intent)
        assert HR.id in result
        assert FIN.id in result

    def test_version_filter_is_subset_of_rbac(self):
        """Version filter must NEVER expand beyond the RBAC-allowed set."""
        # Only v2.0 is in RBAC-allowed; comparison asks for both
        intent = QueryIntent(
            mode=IntentMode.COMPARISON, requested_versions=("1.0", "2.0")
        )
        result = apply_version_filter([IT_V2.id], ALL_DOCS, intent)
        for doc_id in result:
            assert doc_id in {IT_V2.id}, (
                f"Version filter added {doc_id} which was not in RBAC set"
            )

    def test_admin_normal_query_gets_latest_only(self):
        """Even admin gets only latest versions for NORMAL queries."""
        intent = QueryIntent(mode=IntentMode.NORMAL)
        # None = admin (unrestricted RBAC)
        result = apply_version_filter(None, ALL_DOCS, intent)
        assert IT_V2.id in result,    "Admin must get latest IT version"
        assert IT_V1.id not in result,"Admin must NOT get old IT version for NORMAL"

    def test_admin_comparison_gets_unrestricted(self):
        """Admin comparison query → None returned (full FAISS search)."""
        intent = QueryIntent(
            mode=IntentMode.COMPARISON, requested_versions=("1.0", "2.0")
        )
        result = apply_version_filter(None, ALL_DOCS, intent)
        assert result is None, "Admin comparison must pass None to FAISS (unrestricted)"

    def test_three_version_latest_compare(self):
        """With v1, v2, v3: LATEST_COMPARE returns v3 + v2 only."""
        v1 = _doc("id_v1", "Policy.pdf")
        v2 = _doc("id_v2", "Policy_v2.0.pdf")
        v3 = _doc("id_v3", "Policy_v3.0.pdf")
        docs = [v1, v2, v3]
        intent = QueryIntent(mode=IntentMode.LATEST_COMPARE)
        result = apply_version_filter(
            [v1.id, v2.id, v3.id], docs, intent
        )
        assert v3.id in result, "Latest (v3) must be included"
        assert v2.id in result, "Previous (v2) must be included"
        assert v1.id not in result, "Old (v1) must NOT be included in latest-compare"
