from pathlib import Path

import pytest

from flow_fixtures import write_ac_traceability_chain
from logics_manager.audit import audit_payload
from logics_manager.cli import main
from logics_manager.executions import parse_executions, render_executions
from logics_manager.flow.runs import record_run_payload
from logics_manager.lint import lint_payload
from logics_manager.sync import build_context_pack_payload, read_logics_doc_payload
from logics_manager.mcp import _tool_read_logics_doc


def record(root, source="task_001_demo", **kwargs):
    return record_run_payload(root, source, runner="ci", run_id="1", state="running", **kwargs)


@pytest.mark.parametrize("kind,ref", [("request", "req_001_demo"), ("backlog", "item_001_demo"), ("task", "task_001_demo")])
def test_section_creation_and_update_preserves_other_sections(tmp_path, kind, ref):
    paths = write_ac_traceability_chain(tmp_path)
    path = paths[kind]
    original = path.read_text()
    record(tmp_path, ref, title="Build | test", pr="https://example.com/pull/1", notes="First\ntry")
    assert path.read_text().startswith(original)
    path.write_text(path.read_text() + "# Other section\nKeep exactly.\n")
    record_run_payload(tmp_path, ref, runner="ci", run_id="1", state="failed", notes="Retry")
    rows = parse_executions(path.read_text())
    assert len(rows) == 1
    assert rows[0]["Title"] == "Build | test"
    assert rows[0]["PR"] == "https://example.com/pull/1"
    assert rows[0]["State"] == "failed"
    assert rows[0]["Notes"] == "Retry"
    assert path.read_text().endswith("# Other section\nKeep exactly.\n")


def test_newest_first_and_updated_time(tmp_path):
    path = write_ac_traceability_chain(tmp_path)["task"]
    record(tmp_path)
    first_time = parse_executions(path.read_text())[0]["When"]
    record_run_payload(tmp_path, path.stem, runner="agent", run_id="2", state="queued")
    record(tmp_path, notes="Update")
    rows = parse_executions(path.read_text())
    assert [(r["Runner"], r["Run id"]) for r in rows] == [("ci", "1"), ("agent", "2")]
    assert rows[0]["When"] > first_time


@pytest.mark.parametrize("overrides", [{"state": "unknown"}, {"source": "task_999_missing"}, {"source": "../../etc/passwd"}, {"pr": "javascript:alert(1)"}, {"pr": "https:///pull/1"}, {"pr": "https://example.com:invalid/pull/1"}, {"progress": "auto", "source": "req_001_demo"}])
def test_invalid_input_refused_without_writes(tmp_path, overrides):
    paths = write_ac_traceability_chain(tmp_path)
    before = {path: path.read_bytes() for path in paths.values()}
    args = dict(source="task_001_demo", runner="agent", run_id="1", state="running")
    args.update(overrides)
    with pytest.raises(SystemExit):
        record_run_payload(tmp_path, **args)
    assert before == {path: path.read_bytes() for path in paths.values()}


def test_progress_auto_and_dry_run(tmp_path):
    paths = write_ac_traceability_chain(tmp_path)
    record_run_payload(tmp_path, paths["task"].stem, runner="ci", run_id="1", state="failed")
    before = {p: p.read_bytes() for p in paths.values()}
    result = record_run_payload(tmp_path, paths["task"].stem, runner="ci", run_id="2", state="merged", progress="auto", dry_run=True)
    assert result["progress"] == "50%"
    assert len(result["changed_files"]) == 2
    assert before == {p: p.read_bytes() for p in paths.values()}
    record_run_payload(tmp_path, paths["task"].stem, runner="ci", run_id="2", state="succeeded", progress="auto")
    assert "> Progress: 50%" in paths["task"].read_text()
    assert "> Progress: 50%" in paths["backlog"].read_text()


def test_bounded_reads_and_mcp(tmp_path, monkeypatch, capsys):
    path = write_ac_traceability_chain(tmp_path)["task"]
    for number in range(25):
        record_run_payload(tmp_path, path.stem, runner="agent", run_id=str(number), state="succeeded")
    payload = read_logics_doc_payload(tmp_path, path.stem, max_chars=50)
    assert len(payload["executions"]["rows"]) == 20
    assert payload["executions"]["older_count"] == 5
    assert "5 older executions omitted" in payload["content"]
    assert payload["executions"]["rows"][0]["Run id"] == "24"
    assert "| 0 |" not in payload["content"]
    mcp = _tool_read_logics_doc(tmp_path, {"source": path.stem}, "read_logics_doc")
    assert mcp["executions"] == payload["executions"]
    for mode in ("summary-only", "full", "diff-first"):
        pack = build_context_pack_payload(tmp_path, path.stem, mode=mode)
        entry = next(doc for doc in pack["docs"] if doc["ref"] == path.stem)
        assert entry["executions"] == payload["executions"]
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _: tmp_path)
    assert main(["flow", "show", path.stem]) == 0
    assert "5 older executions omitted" in capsys.readouterr().out


@pytest.mark.parametrize("mutation", [lambda text: text.replace("| State |", "| Status |"), lambda text: text.replace("running", "unknown"), lambda text: text.replace("2026-01-01T00:00:00Z", "yesterday")])
def test_lint_and_audit_malformed_table(tmp_path, mutation):
    path = write_ac_traceability_chain(tmp_path)["task"]
    row = dict(zip(("When", "Runner", "Run id", "Title", "State", "PR", "Notes"), ("2026-01-01T00:00:00Z", "ci", "1", "Build", "running", "", "")))
    path.write_text(path.read_text() + mutation(render_executions([row])))
    assert "Executions:" in str(lint_payload(tmp_path))
    assert "executions_invalid" in str(audit_payload(tmp_path))


def test_latest_failed_needs_attention(tmp_path):
    path = write_ac_traceability_chain(tmp_path)["task"]
    record_run_payload(tmp_path, path.stem, runner="ci", run_id="1", state="failed")
    assert "execution_failed" in str(audit_payload(tmp_path))
    record_run_payload(tmp_path, path.stem, runner="ci", run_id="1", state="succeeded")
    assert "execution_failed" not in str(audit_payload(tmp_path))


def test_cli_record_run_and_new_template(tmp_path, monkeypatch, capsys):
    (tmp_path / "logics/request").mkdir(parents=True)
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _: tmp_path)
    assert main(["flow", "new", "request", "--title", "Execution example", "--format", "json"]) == 0
    import json
    created = json.loads(capsys.readouterr().out)
    assert "# Executions\n| When | Runner | Run id | Title | State | PR | Notes |" in (tmp_path / created["path"]).read_text()
    assert main(["flow", "record-run", created["ref"], "--runner", "ci", "--run-id", "1", "--state", "queued", "--format", "json"]) == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["execution"]["State"] == "queued"


def test_record_preserves_crlf_prose(tmp_path):
    path = write_ac_traceability_chain(tmp_path)["task"]
    original = path.read_bytes().replace(b"\n", b"\r\n")
    path.write_bytes(original)
    record(tmp_path)
    assert path.read_bytes().startswith(original)
    suffix = b"# Final section\r\nKeep the original line endings.\r\n"
    path.write_bytes(path.read_bytes() + suffix)
    record(tmp_path, notes="Update")
    assert path.read_bytes().startswith(original)
    assert path.read_bytes().endswith(suffix)


def test_context_pack_refreshes_after_run_update(tmp_path):
    path = write_ac_traceability_chain(tmp_path)["task"]
    record(tmp_path)
    before = build_context_pack_payload(tmp_path, path.stem)
    record_run_payload(tmp_path, path.stem, runner="ci", run_id="1", state="failed")
    after = build_context_pack_payload(tmp_path, path.stem)
    old_entry = next(doc for doc in before["docs"] if doc["ref"] == path.stem)
    new_entry = next(doc for doc in after["docs"] if doc["ref"] == path.stem)
    assert old_entry["executions"]["rows"][0]["State"] == "running"
    assert new_entry["executions"]["rows"][0]["State"] == "failed"
    assert "failed" in new_entry["execution_table"]


def test_cli_read_doc_is_bounded(tmp_path, monkeypatch, capsys):
    import json
    path = write_ac_traceability_chain(tmp_path)["task"]
    for number in range(21):
        record_run_payload(tmp_path, path.stem, runner="ci", run_id=str(number), state="queued")
    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _: tmp_path)
    assert main(["sync", "read-doc", path.stem, "--section", "Executions", "--format", "json"]) == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["executions"]["older_count"] == 1
    assert len(payload["sections"]["Executions"]) == 24
    assert "| 0 |" not in payload["content"]


def test_malformed_table_refuses_update(tmp_path):
    path = write_ac_traceability_chain(tmp_path)["task"]
    path.write_text(path.read_text() + "# Executions\nNot a table.\n")
    before = path.read_bytes()
    with pytest.raises(SystemExit, match="Executions:"):
        record(tmp_path)
    assert path.read_bytes() == before


def test_scaffold_and_native_templates_have_empty_execution_tables(tmp_path):
    from argparse import Namespace
    from logics_manager.flow.docs import _build_native_request_doc, _build_native_backlog_doc, _build_native_task_doc
    from logics_manager.flow.scaffold_docs import (
        _build_scaffold_request_doc, _build_scaffold_backlog_doc, _build_scaffold_task_doc, _build_split_orchestration_task_doc,
    )
    args = Namespace()
    documents = [
        _build_native_request_doc(tmp_path, "req_001_demo", "Demo", args),
        _build_native_backlog_doc(tmp_path, "item_001_demo", "Demo", args),
        _build_native_task_doc(tmp_path, "task_001_demo", "Demo", args),
        _build_scaffold_request_doc(tmp_path, "req_001_demo", "Demo", {}),
        _build_scaffold_backlog_doc(tmp_path, "item_001_demo", "req_001_demo", "prod_001_demo", "task_001_demo", {}),
        _build_scaffold_task_doc(tmp_path, "task_001_demo", "Demo", "req_001_demo", "prod_001_demo", ["item_001_demo"], {}),
        _build_split_orchestration_task_doc(tmp_path, "task_001_demo", "Demo", "req_001_demo", ["item_001_demo"], "Implement demo"),
    ]
    for document in documents:
        assert document.count("# Executions") == 1
        assert parse_executions(document) == []


def test_execution_heading_in_fenced_example_is_preserved(tmp_path):
    path = write_ac_traceability_chain(tmp_path)["task"]
    example = "# Example\n```markdown\n# Executions\nThis is an example, not a table.\n```\n"
    original = path.read_text() + example
    path.write_text(original)
    record(tmp_path)
    assert path.read_text().startswith(original)
    assert len(parse_executions(path.read_text())) == 1
    record(tmp_path, notes="Update")
    assert path.read_text().startswith(original)
