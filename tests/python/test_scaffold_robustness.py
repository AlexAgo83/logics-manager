from __future__ import annotations

from pathlib import Path

import pytest

from logics_manager.flow import _resolve_any_workflow_source, scaffold_request_chain_payload
from logics_manager.sync import _context_profile_limit


def _repo(tmp_path: Path) -> Path:
    repo_root = tmp_path / "logics-repo"
    for rel in ("request", "backlog", "tasks", "product"):
        (repo_root / "logics" / rel).mkdir(parents=True)
    return repo_root


def _valid_input() -> dict:
    return {
        "title": "Robustness Demo",
        "backlog_items": [{"title": "First slice", "acceptance_criteria": ["AC1: ok"]}],
        "context_pack": {"out": "logics/context-packs/demo.json", "mode": "summary-only", "profile": "normal"},
    }


def _doc_count(repo_root: Path) -> int:
    return len(list((repo_root / "logics").rglob("*.md")))


# item_522: pre-flight validation, shared by dry-run and apply.
def test_unknown_profile_rejected_before_any_write(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    payload = _valid_input()
    payload["context_pack"]["profile"] = "dev"  # the original dogfood failure

    with pytest.raises(SystemExit) as excinfo:
        scaffold_request_chain_payload(repo_root, input_payload=payload, context_pack_out=None, dry_run=False)
    message = str(excinfo.value)
    assert "context_pack.profile" in message
    assert "tiny, normal, deep" in message
    assert "dev" in message
    assert _doc_count(repo_root) == 0  # nothing written


def test_dry_run_and_apply_validate_identically(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    payload = _valid_input()
    payload["context_pack"]["mode"] = "bogus"

    # A green dry-run must not be possible when the input is invalid.
    for dry_run in (True, False):
        with pytest.raises(SystemExit) as excinfo:
            scaffold_request_chain_payload(repo_root, input_payload=payload, context_pack_out=None, dry_run=dry_run)
        assert "context_pack.mode" in str(excinfo.value)
    assert _doc_count(repo_root) == 0


def test_context_profile_limit_raises_clear_error() -> None:
    assert _context_profile_limit("normal") == 4
    with pytest.raises(ValueError) as excinfo:
        _context_profile_limit("dev")
    assert "dev" in str(excinfo.value)
    assert "tiny" in str(excinfo.value)


# item_523: atomic apply — a mid-apply failure rolls back cleanly and a corrected
# re-run reuses the same ids.
def test_failed_apply_rolls_back_and_reuses_ids(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    import logics_manager.flow as flow_mod

    repo_root = _repo(tmp_path)
    payload = _valid_input()  # context_pack.out is set, so the pack build is reached

    def boom(*_args: object, **_kwargs: object) -> object:
        raise RuntimeError("injected mid-apply failure")

    monkeypatch.setattr(flow_mod, "build_context_pack_payload", boom)
    with pytest.raises(RuntimeError):
        scaffold_request_chain_payload(repo_root, input_payload=payload, context_pack_out=None, dry_run=False)

    # AC1: the repo is left unchanged — no orphaned docs, no INDEX.
    assert _doc_count(repo_root) == 0
    assert not (repo_root / "logics" / "INDEX.md").exists()

    # AC2: a corrected re-run reuses exactly the ids the failed run would have used.
    monkeypatch.undo()
    result = scaffold_request_chain_payload(repo_root, input_payload=payload, context_pack_out=None, dry_run=False)
    assert result["request_ref"] == "req_000_robustness_demo"
    assert result["backlog_refs"] == ["item_001_first_slice"]
    assert result["task_ref"] == "task_001_orchestrate_robustness_demo"
    assert _doc_count(repo_root) >= 4
    assert (repo_root / "logics" / "INDEX.md").is_file()


# item_524: short workflow ref resolution in validate/audit with a did-you-mean hint.
def test_short_ref_resolves_to_full_slug(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    doc = repo_root / "logics" / "request" / "req_285_single_source_assets.md"
    doc.write_text("# req_285\n", encoding="utf-8")

    path, kind = _resolve_any_workflow_source(repo_root, "req_285")
    assert path == doc
    assert kind == "request"


def test_missing_short_ref_lists_candidates(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    (repo_root / "logics" / "request" / "req_285_single_source_assets.md").write_text("# x\n", encoding="utf-8")
    (repo_root / "logics" / "request" / "req_284_activity_feed.md").write_text("# y\n", encoding="utf-8")

    with pytest.raises(SystemExit) as excinfo:
        _resolve_any_workflow_source(repo_root, "req_999")
    message = str(excinfo.value)
    assert "Workflow source not found: req_999" in message
    assert "did you mean" in message
    assert "req_285_single_source_assets" in message
