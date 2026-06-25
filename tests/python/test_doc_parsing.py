from __future__ import annotations

import logics_manager.audit as audit
import logics_manager.flow as flow
import logics_manager.insights as insights
import logics_manager.lint as lint
import logics_manager.obsidian as obsidian
import logics_manager.sync as sync
from logics_manager import doc_parsing


def test_extract_refs_sorts_dedupes_and_optionally_strips_mermaid() -> None:
    text = "see req_002_b and req_001_a and req_001_a\n```mermaid\nreq_999_x\n```\n"
    assert doc_parsing.extract_refs(text, "req") == ["req_001_a", "req_002_b", "req_999_x"]
    assert doc_parsing.extract_refs(text, "req", strip_mermaid=True) == ["req_001_a", "req_002_b"]


def test_indicator_value_and_progress_value() -> None:
    lines = ["## t", "> Status:  Ready ", "> Progress: 42%"]
    assert doc_parsing.indicator_value(lines, "Status") == "Ready"
    assert doc_parsing.indicator_value(lines, "Missing") is None
    assert doc_parsing.progress_value("42%") == 42
    assert doc_parsing.progress_value("999") == 100
    assert doc_parsing.progress_value(None) is None


def test_section_lines_returns_body_until_next_heading() -> None:
    lines = ["# A", "- one", "- two", "# B", "- three"]
    assert doc_parsing.section_lines(lines, "A") == ["- one", "- two"]
    assert doc_parsing.section_lines(lines, "missing") == []


def test_callers_consume_the_shared_definitions() -> None:
    # audit keeps a set-returning adapter; the rest alias the shared function directly.
    assert lint._extract_refs is doc_parsing.extract_refs
    assert sync._extract_refs is doc_parsing.extract_refs
    assert flow._extract_refs is doc_parsing.extract_refs
    assert lint._indicator_value is doc_parsing.indicator_value
    assert sync._indicator_value is doc_parsing.indicator_value
    assert obsidian._indicator_value is doc_parsing.indicator_value
    assert audit._indicator_value is doc_parsing.indicator_value
    assert insights._progress_value is doc_parsing.progress_value
    assert audit._progress_value is doc_parsing.progress_value
    # audit's _extract_refs still returns a mermaid-stripped set.
    assert audit._extract_refs("req_001_a ```mermaid\nreq_9_x\n```", "req") == {"req_001_a"}
