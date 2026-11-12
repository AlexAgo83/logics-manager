"""CLI coverage for reasoned retirement and companion lifecycle changes."""
import json
from pathlib import Path

import pytest

from logics_manager.cli import main
from logics_manager.statuses import stage_statuses


@pytest.fixture
def repo(tmp_path, monkeypatch):
    (tmp_path / "logics").mkdir()
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: tmp_path)
    return tmp_path


def doc(repo, kind, ref, status="Draft", body=""):
    directory = "tasks" if kind == "task" else kind
    path = repo / "logics" / directory / f"{ref}.md"
    path.parent.mkdir(exist_ok=True)
    path.write_text(f"## {ref} - Example\n> Status: {status}\n\n{body}\n", encoding="utf-8")
    return path


@pytest.mark.parametrize("kind,ref", [("request", "req_001_old"), ("backlog", "item_001_old"), ("task", "task_001_old")])
@pytest.mark.parametrize("dry_run", [False, True])
def test_retire_each_workflow_kind(repo, capsys, kind, ref, dry_run):
    path = doc(repo, kind, ref, body="# Example\n> Status: Done\n- [ ] Unfinished")
    before = path.read_bytes()
    argv = ["flow", "withdraw", ref, "--reason", "Scope abandoned", "--format", "json"]
    assert main(argv + (["--dry-run"] if dry_run else [])) == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["reason"] == "Scope abandoned"
    if dry_run:
        assert path.read_bytes() == before
    else:
        assert "> Status: Obsolete" in path.read_text()
        assert "> Status: Done" in path.read_text()  # Body example is untouched.
        assert "Scope abandoned" in path.read_text()
        assert "- [ ] Unfinished" in path.read_text()
        assert "100%" not in path.read_text()


@pytest.mark.parametrize("dry_run", [False, True])
def test_retirement_propagates_conditionally(repo, capsys, dry_run):
    request = doc(repo, "request", "req_001_parent")
    item = doc(repo, "backlog", "item_001_parent", body="# Links\n- Request: `req_001_parent`")
    task = doc(repo, "task", "task_001_child", body="# Backlog\n- Derived from `item_001_parent`")
    sibling = doc(repo, "task", "task_002_child", body="# Backlog\n- Derived from `item_001_parent`")
    args = ["flow", "withdraw", task.stem, "--reason", "Scope abandoned", "--format", "json"]
    assert main(args) == 0
    assert "Status: Draft" in item.read_text()
    capsys.readouterr()
    before = {path: path.read_bytes() for path in (request, item, task, sibling)}
    args[2] = sibling.stem
    assert main(args + (["--dry-run"] if dry_run else [])) == 0
    payload = json.loads(capsys.readouterr().out)
    assert len(payload["changed_files"]) == 3
    for path in (request, item, sibling):
        if dry_run:
            assert path.read_bytes() == before[path]
        else:
            assert "Status: Obsolete" in path.read_text()
            assert "Scope abandoned" in path.read_text()


@pytest.mark.parametrize("reason", [None, "", "   ", "Bad\nreason"])
def test_retirement_requires_reason(repo, reason):
    path = doc(repo, "request", "req_001_old")
    before = path.read_bytes()
    with pytest.raises(SystemExit, match="reason"):
        main(["flow", "withdraw", path.stem] + ([] if reason is None else ["--reason", reason]))
    assert path.read_bytes() == before


@pytest.mark.parametrize("dry_run", [False, True])
def test_replacement_withdrawal_stays_local_without_reason(repo, dry_run):
    request = doc(repo, "request", "req_001_parent")
    item = doc(repo, "backlog", "item_001_old", body="# Links\n- Request: `req_001_parent`")
    before = item.read_bytes()
    assert main(["flow", "withdraw", item.stem, "--superseded-by", "item_002_new"] + (["--dry-run"] if dry_run else [])) == 0
    assert "Status: Draft" in request.read_text()
    if dry_run:
        assert item.read_bytes() == before
    else:
        assert "Superseded by: `item_002_new`" in item.read_text()
        assert "# Notes" not in item.read_text()


COMPANIONS = [("product", "prod_001_brief"), ("architecture", "adr_001_choice"), ("runbook", "run_001_ops"), ("roadmap", "road_001_plan")]


@pytest.mark.parametrize("kind,ref", COMPANIONS)
@pytest.mark.parametrize("dry_run", [False, True])
def test_companion_status_valid_vocabulary(repo, capsys, kind, ref, dry_run):
    for status in stage_statuses(kind):
        path = doc(repo, kind, ref)
        before = path.read_bytes()
        args = ["flow", "status", kind, ref, "--status", status.lower(), "--reason", "Reviewed lifecycle", "--format", "json"]
        assert main(args + (["--dry-run"] if dry_run else [])) == 0
        result = json.loads(capsys.readouterr().out)
        assert result["status"] == status
        assert result["updated_indicators"] == {"Status": status}
        assert result["touched"] is True
        if dry_run:
            assert path.read_bytes() == before
        else:
            assert f"> Status: {status}" in path.read_text()
            assert "Reviewed lifecycle" in path.read_text()


@pytest.mark.parametrize("kind,ref", COMPANIONS)
@pytest.mark.parametrize("dry_run", [False, True])
def test_companion_rejects_invalid_status_with_alternatives(repo, kind, ref, dry_run):
    path = doc(repo, kind, ref)
    before = path.read_bytes()
    with pytest.raises(SystemExit) as error:
        main(["flow", "status", kind, ref, "--status", "Obsolete", "--reason", "Retired"] + (["--dry-run"] if dry_run else []))
    for status in stage_statuses(kind):
        assert status in str(error.value)
    if kind == "runbook":
        assert "use Archived" in str(error.value)
    assert path.read_bytes() == before


@pytest.mark.parametrize("kind,ref", COMPANIONS)
def test_companion_requires_reason_and_respects_terminal_status(repo, kind, ref):
    path = doc(repo, kind, ref, "Archived")
    before = path.read_bytes()
    for extra in ([], ["--reason", ""], ["--reason", "Reopen"]):
        with pytest.raises(SystemExit):
            main(["flow", "status", kind, ref, "--status", "Draft"] + extra)
    assert path.read_bytes() == before


def test_retirement_does_not_reopen_archived_document(repo):
    path = doc(repo, "task", "task_001_old", "Archived")
    with pytest.raises(SystemExit, match="terminal"):
        main(["flow", "withdraw", path.stem, "--reason", "Retired", "--dry-run"])
    assert "Status: Archived" in path.read_text()


@pytest.mark.parametrize("kind,ref", COMPANIONS)
def test_companion_status_preserves_lint_contract(repo, capsys, kind, ref):
    from logics_manager.lint import lint_payload

    if kind == "roadmap":
        args = ["flow", "roadmap", "propose", "--title", "Plan", "--milestone", "1.0: Deliver"]
    else:
        args = ["flow", "companion", kind, "--title", "Example"]
    assert main(args + ["--format", "json"]) == 0
    created = json.loads(capsys.readouterr().out)
    assert main(["flow", "status", kind, created["ref"], "--status", "Archived", "--reason", "No longer needed"]) == 0
    assert lint_payload(repo, require_status=True)["ok"] is True


@pytest.mark.parametrize("sibling_status", ["Done", "Archived", "Obsolete"])
def test_retirement_accepts_closed_siblings(repo, sibling_status):
    parent = doc(repo, "backlog", "item_001_parent")
    task = doc(repo, "task", "task_001_child", body="# Backlog\n- `item_001_parent`")
    doc(repo, "task", "task_002_child", sibling_status, body="# Backlog\n- `item_001_parent`")
    assert main(["flow", "withdraw", task.stem, "--reason", "No longer needed"]) == 0
    assert "Status: Obsolete" in parent.read_text()


def test_companion_status_rejects_wrong_kind(repo):
    path = doc(repo, "runbook", "run_001_ops")
    with pytest.raises(SystemExit, match="Expected a product document"):
        main(["flow", "status", "product", path.stem, "--status", "Archived", "--reason", "Retired"])
    assert "Status: Draft" in path.read_text()


@pytest.mark.parametrize("dry_run", [False, True])
def test_companion_status_text_reports_transition(repo, capsys, dry_run):
    doc(repo, "runbook", "run_001_ops")
    assert main(["flow", "status", "runbook", "run_001_ops", "--status", "Archived", "--reason", "Service retired"] + (["--dry-run"] if dry_run else [])) == 0
    output = capsys.readouterr().out
    assert ("Would change" if dry_run else "Changed") in output
    assert "Archived: Service retired" in output


def test_retirement_rolls_back_chain_if_reason_write_fails(repo, monkeypatch):
    import logics_manager.flow.lifecycle as lifecycle

    parent = doc(repo, "backlog", "item_001_parent")
    task = doc(repo, "task", "task_001_child", body="# Backlog\n- `item_001_parent`")
    before = {path: path.read_bytes() for path in (parent, task)}
    append = lifecycle._append_section_bullets

    def fail_on_parent(path, *args, **kwargs):
        if path == parent:
            raise OSError("Simulated write failure")
        return append(path, *args, **kwargs)

    monkeypatch.setattr(lifecycle, "_append_section_bullets", fail_on_parent)
    with pytest.raises(OSError, match="Simulated write failure"):
        main(["flow", "withdraw", task.stem, "--reason", "No longer needed"])
    assert all(path.read_bytes() == content for path, content in before.items())
