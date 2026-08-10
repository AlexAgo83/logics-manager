"""Contract tests for req_330/item_687: the runbook companion document kind.

Pins the pieces of the contract that have no other test coverage once the
generic companion machinery (lint/audit/sync/mcp/index) is extended for
`runbook`: the controlled category vocabulary, the Active-requires-Verified
rule, the index rendering, and the agent-facing discovery wording.
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
