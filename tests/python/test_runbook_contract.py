"""Contract tests for req_330/item_687+item_688: the runbook companion kind.

Pins the pieces of the contract that have no other test coverage once the
generic companion machinery (lint/audit/sync/mcp/index) is extended for
`runbook`: the controlled category vocabulary, the Active-requires-Verified
rule, the index rendering, the agent-facing discovery wording, and the
bounded `match-runbooks` lookup (item_688).
"""

from __future__ import annotations

from pathlib import Path

import pytest

from logics_manager.cli import main
from logics_manager.index import index_payload


def _repo(tmp_path: Path, *dirs: str) -> Path:
    repo_root = tmp_path / "logics-repo"
    for rel in dirs:
        (repo_root / "logics" / rel).mkdir(parents=True, exist_ok=True)
    return repo_root


def _write_runbook(repo_root: Path, *, status: str, category: str, verified: str) -> Path:
    path = repo_root / "logics" / "runbook" / "run_001_probe.md"
    path.write_text(
        "\n".join(
            [
                "## run_001_probe - Probe",
                f"> Status: {status}",
                f"> Category: {category}",
                f"> Verified: {verified}",
                "> Related request: (none yet)",
                "> Related backlog: (none yet)",
                "> Related task: (none yet)",
                "> Reminder: Update status, category, verification, and linked refs when you edit this doc.",
                "",
                "# Trigger",
                "- when the probe fires",
                "",
                "# Prerequisites",
                "- access to the probe",
                "",
                "# Procedure",
                "- run the probe",
                "",
                "# Verification",
                "- probe returns green",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return path


def test_runbook_category_must_be_in_the_controlled_vocabulary(tmp_path: Path) -> None:
    from logics_manager.lint import lint_payload

    repo_root = _repo(tmp_path, "runbook")
    _write_runbook(repo_root, status="Draft", category="made-up-category", verified="(not yet verified)")

    payload = lint_payload(repo_root)
    messages = [issue["message"] for issue in payload["issues"]]
    assert any("invalid Category value" in message for message in messages), messages


def test_active_runbook_requires_verification_not_a_placeholder(tmp_path: Path) -> None:
    from logics_manager.lint import lint_payload

    repo_root = _repo(tmp_path, "runbook")
    _write_runbook(repo_root, status="Active", category="release", verified="(not yet verified)")

    payload = lint_payload(repo_root)
    messages = [issue["message"] for issue in payload["issues"]]
    assert any("requires a Verified date" in message for message in messages), messages


def test_active_runbook_with_real_verification_passes_lint(tmp_path: Path) -> None:
    from logics_manager.lint import lint_payload

    repo_root = _repo(tmp_path, "runbook")
    _write_runbook(repo_root, status="Active", category="release", verified="2026-08-11, ran the restart end to end")

    payload = lint_payload(repo_root)
    assert payload["issues"] == [], payload["issues"]


def test_index_renders_a_runbooks_section_with_category_and_verification(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path, "runbook")
    _write_runbook(repo_root, status="Active", category="release", verified="2026-08-11, verified")

    payload = index_payload(repo_root)
    assert payload["counts"]["runbook"] == 1

    index_text = (repo_root / "logics" / "INDEX.md").read_text(encoding="utf-8")
    assert "## Runbooks" in index_text
    assert "| Doc | Title | Status | Category | Verified | Path |" in index_text
    assert "release" in index_text
    assert "2026-08-11, verified" in index_text


def test_generated_instructions_tell_an_agent_where_runbooks_live(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    monkeypatch.chdir(repo_root)

    exit_code = main(["bootstrap"])
    assert exit_code == 0

    instructions_text = (repo_root / "logics" / "instructions.md").read_text(encoding="utf-8")
    assert "logics/runbook/" in instructions_text
    assert "sync search-docs --kind runbook" in instructions_text
    assert "flow companion runbook" in instructions_text


def test_runbook_with_no_delivery_link_is_not_flagged_by_audit(tmp_path: Path) -> None:
    from logics_manager.audit import audit_payload

    repo_root = _repo(tmp_path, "runbook", "request", "backlog", "tasks")
    _write_runbook(repo_root, status="Active", category="release", verified="2026-08-11, verified")

    payload = audit_payload(repo_root)
    codes = {issue["code"] for issue in payload["issues"]}
    assert "companion_doc_missing_primary_link" not in codes
    assert "companion_doc_missing_mermaid" not in codes


# --- item_688: bounded, explainable match-runbooks lookup -------------------


def test_match_runbooks_ranks_category_match_above_text_match(tmp_path: Path) -> None:
    from logics_manager.sync import match_runbooks_payload

    repo_root = _repo(tmp_path, "runbook")
    _write_runbook(repo_root, status="Active", category="release", verified="2026-08-11, verified")

    payload = match_runbooks_payload(repo_root, "release")
    assert payload["returned_count"] == 1
    assert payload["no_match"] is False
    match = payload["matches"][0]
    assert match["ref"] == "run_001_probe"
    assert "category matches" in match["reason"]


def test_match_runbooks_finds_trigger_text(tmp_path: Path) -> None:
    from logics_manager.sync import match_runbooks_payload

    repo_root = _repo(tmp_path, "runbook")
    _write_runbook(repo_root, status="Active", category="release", verified="2026-08-11, verified")

    payload = match_runbooks_payload(repo_root, "when the probe fires")
    assert payload["returned_count"] == 1
    assert "Trigger" in payload["matches"][0]["reason"]


def test_match_runbooks_ignores_draft_and_archived(tmp_path: Path) -> None:
    from logics_manager.sync import match_runbooks_payload

    repo_root = _repo(tmp_path, "runbook")
    _write_runbook(repo_root, status="Draft", category="release", verified="(not yet verified)")

    payload = match_runbooks_payload(repo_root, "release")
    assert payload["returned_count"] == 0
    assert payload["no_match"] is True


def test_match_runbooks_no_match_is_not_an_error(tmp_path: Path) -> None:
    from logics_manager.sync import match_runbooks_payload

    repo_root = _repo(tmp_path, "runbook")
    _write_runbook(repo_root, status="Active", category="release", verified="2026-08-11, verified")

    payload = match_runbooks_payload(repo_root, "totally unrelated banana")
    assert payload["no_match"] is True
    assert payload["matches"] == []


def test_match_runbooks_caps_results_at_three(tmp_path: Path) -> None:
    from logics_manager.sync import match_runbooks_payload

    repo_root = _repo(tmp_path, "runbook")
    for n in range(1, 6):
        path = repo_root / "logics" / "runbook" / f"run_{n:03d}_probe.md"
        path.write_text(
            "\n".join(
                [
                    f"## run_{n:03d}_probe - Probe {n}",
                    "> Status: Active",
                    "> Category: release",
                    "> Verified: 2026-08-11, verified",
                    "> Related request: (none yet)",
                    "> Related backlog: (none yet)",
                    "> Related task: (none yet)",
                    "> Reminder: Update status, category, verification, and linked refs when you edit this doc.",
                    "",
                    "# Trigger",
                    "- probe fires",
                    "",
                ]
            ),
            encoding="utf-8",
        )

    payload = match_runbooks_payload(repo_root, "release")
    assert payload["returned_count"] == 3
    assert payload["limit"] == 3


def test_mcp_match_runbooks_tool_returns_bounded_ranked_matches(tmp_path: Path) -> None:
    from logics_manager.bootstrap import bootstrap_payload
    from logics_manager.mcp import call_tool

    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    bootstrap_payload(repo_root, check=False)
    _write_runbook(repo_root, status="Active", category="release", verified="2026-08-11, verified")

    result = call_tool("match_runbooks", {"query": "release"}, repo_root=repo_root)
    assert result["ok"] is True
    assert result["returned_count"] == 1
    assert result["matches"][0]["ref"] == "run_001_probe"

    empty = call_tool("match_runbooks", {"query": "totally unrelated banana"}, repo_root=repo_root)
    assert empty["ok"] is True
    assert empty["no_match"] is True


def test_cli_match_runbooks_reports_no_match_without_error(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    repo_root = _repo(tmp_path, "runbook")
    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["sync", "match-runbooks", "totally unrelated banana"])
    out = capsys.readouterr().out

    assert exit_code == 0
    assert "No Active runbook matched" in out


def test_kind_filter_pushed_into_loading_matches_filtering_afterwards(tmp_path: Path) -> None:
    """The `only_kinds` fast path must select the same docs the old post-filter did.

    `/api/runbooks` parsed all ~1700 corpus docs to return 2 runbooks (~18s per call);
    the filter now happens at directory level. It reads `INDICATOR_TARGET_KINDS` keys
    while callers pass `doc.kind` values, so this pins the two to each other -- a key
    that stops matching its docs' `kind` would silently return an empty list.
    """
    from logics_manager.sync import INDICATOR_TARGET_KINDS, _load_workflow_docs, list_logics_docs_payload

    repo_root = tmp_path / "repo"
    for name, kind in INDICATOR_TARGET_KINDS.items():
        directory = repo_root / kind["directory"]
        directory.mkdir(parents=True, exist_ok=True)
        prefix = kind["prefix"][0] if isinstance(kind["prefix"], tuple) else kind["prefix"]
        (directory / f"{prefix}_001_{name}.md").write_text(
            f"## {prefix}_001_{name} - A {name}\n> Status: Active\n", encoding="utf-8"
        )

    everything = _load_workflow_docs(repo_root)
    assert len(everything) == len(INDICATOR_TARGET_KINDS)

    seen: set[str] = set()
    for name in INDICATOR_TARGET_KINDS:
        refs = set(_load_workflow_docs(repo_root, only_kinds=(name,)))
        assert refs == {ref for ref, doc in everything.items() if doc.kind == name}, name
        assert {item["ref"] for item in list_logics_docs_payload(repo_root, kind=name)["items"]} == refs, name
        seen |= refs
    assert seen == set(everything)
