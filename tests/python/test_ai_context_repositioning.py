"""req_321/item_663: `# AI Context` has to survive a default-budget bounded read.

`flow show`/`read_logics_doc` render `payload["content"]`, a plain
`text[:max_chars]` slice (sync.py, default 4000 chars) with no section
awareness. Every doc generator now writes `# AI Context` immediately after
the indicator block (item_662); this covers the repair path for docs that
already exist with it somewhere else.
"""

from __future__ import annotations

from pathlib import Path

from logics_manager.audit import _autofix_structure, _reposition_ai_context
from logics_manager.sync import read_logics_doc_payload


def _write_doc_with_trailing_ai_context(path: Path, *, filler_lines: int = 0) -> None:
    lines = [
        f"## {path.stem} - Demo request",
        "> From version: 1.0.0",
        "> Schema version: 1.0",
        "> Status: Draft",
        "> Understanding: 90%",
        "> Confidence: 85%",
        "> Complexity: Medium",
        "> Theme: Demo",
        "> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.",
        "",
        "# Needs",
        "- Deliver the demo.",
        *([f"- Filler line {i} to push this doc past the default read budget." for i in range(filler_lines)]),
        "",
        "# Acceptance criteria",
        "- AC1: The demo is deliverable.",
        "",
        "# AI Context",
        "- Summary: Demo request",
        "- Keywords: demo, request",
        "- Use when: Testing AI Context repositioning.",
        "- Skip when: Never.",
        "",
        "# Backlog",
        "- none",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def test_reposition_moves_ai_context_to_immediately_after_indicators(tmp_path: Path) -> None:
    path = tmp_path / "req_001_demo.md"
    _write_doc_with_trailing_ai_context(path)

    changed = _autofix_structure(path, "request")
    assert changed is True

    lines = path.read_text(encoding="utf-8").splitlines()
    heading_idx = next(idx for idx, line in enumerate(lines) if line.startswith("## "))
    indicator_end = heading_idx + 1
    while lines[indicator_end].lstrip().startswith(">"):
        indicator_end += 1
    # one blank line, then AI Context, immediately - nothing else in between.
    assert lines[indicator_end] == ""
    assert lines[indicator_end + 1] == "# AI Context"


def test_reposition_is_idempotent(tmp_path: Path) -> None:
    path = tmp_path / "req_002_demo.md"
    _write_doc_with_trailing_ai_context(path)

    first = _autofix_structure(path, "request")
    assert first is True
    after_first = path.read_text(encoding="utf-8")

    second = _autofix_structure(path, "request")
    assert second is False
    assert path.read_text(encoding="utf-8") == after_first


def test_reposition_noop_when_already_in_place() -> None:
    """Isolated from `_autofix_structure`'s other checks (status/schema-version
    canonicalization) - this exercises only the AI Context move itself."""
    lines = [
        "## req_003_demo - Demo request",
        "> Status: Draft",
        "> Schema version: 1.0",
        "",
        "# AI Context",
        "- Summary: Demo request",
        "",
        "# Needs",
        "- Deliver the demo.",
        "",
    ]
    assert _reposition_ai_context(lines) is False
    assert lines == [
        "## req_003_demo - Demo request",
        "> Status: Draft",
        "> Schema version: 1.0",
        "",
        "# AI Context",
        "- Summary: Demo request",
        "",
        "# Needs",
        "- Deliver the demo.",
        "",
    ]


def test_default_budget_read_excludes_then_includes_ai_context(tmp_path: Path) -> None:
    """The motivating case: a doc past the default --max-chars budget drops
    AI Context from the rendered text before the repair, and carries it after."""
    repo_root = tmp_path / "repo"
    request_dir = repo_root / "logics" / "request"
    request_dir.mkdir(parents=True)
    path = request_dir / "req_004_demo.md"
    _write_doc_with_trailing_ai_context(path, filler_lines=400)
    assert len(path.read_text(encoding="utf-8")) > 4000, "fixture must exceed the default read budget"

    before = read_logics_doc_payload(repo_root, "req_004_demo", max_chars=4000)
    assert before["truncated"] is True
    assert "# AI Context" not in str(before["content"])

    assert _autofix_structure(path, "request") is True

    after = read_logics_doc_payload(repo_root, "req_004_demo", max_chars=4000)
    assert after["truncated"] is True
    assert "# AI Context" in str(after["content"])
