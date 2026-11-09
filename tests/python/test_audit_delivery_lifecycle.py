"""Delivery exceptions must never turn abandoned work into completed work."""
import pytest

from flow_fixtures import write_ac_traceability_chain
from logics_manager.audit import audit_payload
from logics_manager.flow import flow_validate_payload
from logics_manager.flow.runs import record_run_payload
from logics_manager.lint import lint_payload


def findings(root, **kwargs):
    return audit_payload(root, stale_days=0, **kwargs)["findings"]


@pytest.mark.parametrize("kind", ["request", "backlog", "task"])
def test_obsolete_docs_keep_only_structural_checks(tmp_path, kind):
    paths = write_ac_traceability_chain(tmp_path)
    path = paths[kind]
    path.write_text(path.read_text().replace("Status: Ready", "Status: Obsolete").replace("[x]", "[ ]"))
    record_run_payload(tmp_path, path.stem, runner="mission", run_id="old", state="failed")
    before = path.read_bytes()
    result = findings(tmp_path, governance_profile="strict", autofix_structure=True, autofix_ac_traceability=True)
    assert not [f for f in result if f["path"] == path.relative_to(tmp_path).as_posix()]
    assert path.read_bytes() == before
    path.write_text(path.read_text() + "\n# References\n- `req_999_missing`\n")
    assert "obsolete_refs_missing_target" in {f["code"] for f in findings(tmp_path)}
    path.write_text(path.read_text().replace("| failed |", "| invalid |"))
    assert "executions_invalid" in {f["code"] for f in findings(tmp_path)}
    schema_findings = [f for f in lint_payload(tmp_path)["findings"] if f["path"] == path.relative_to(tmp_path).as_posix()]
    assert any("missing indicator: From version" in f["message"] for f in schema_findings)


@pytest.mark.parametrize("status", ["Active", "Obsolete"])
def test_product_can_reference_obsolete_task(tmp_path, status):
    task = write_ac_traceability_chain(tmp_path)["task"]
    task.write_text(task.read_text().replace("Status: Ready", "Status: Obsolete").replace("[x]", "[ ]"))
    product = tmp_path / "logics/product/prod_001_demo.md"
    product.parent.mkdir()
    diagram = "```mermaid\nflowchart LR\n A --> B\n```\n" if status == "Active" else ""
    product.write_text(f"## prod_001_demo - Historical direction\n> Status: {status}\n# References\n- `task_001_demo`\n{diagram}")
    assert not [f for f in findings(tmp_path) if f["path"] == "logics/product/prod_001_demo.md"]
    assert "task_dod_unchecked" not in {f["code"] for f in findings(tmp_path)}


@pytest.mark.parametrize("status", ["Draft", "Ready", "In progress", "Done"])
@pytest.mark.parametrize("state,pr", [("merged", "https://example.com/pull/1"), ("merged", ""), ("succeeded", "https://example.com/pull/1"), ("closed", "https://example.com/pull/1")])
def test_only_done_requests_with_merged_pr_can_replace_task_chain(tmp_path, status, state, pr):
    paths = write_ac_traceability_chain(tmp_path)
    request = paths["request"]
    request.write_text(request.read_text().replace("Status: Ready", f"Status: {status}") + "> From version: 2.24.3\n")
    paths["task"].unlink()
    paths["backlog"].write_text(paths["backlog"].read_text().replace("Status: Ready", "Status: Done").replace("- Primary task(s): `task_001_demo`\n", ""))
    record_run_payload(tmp_path, request.stem, runner="mission", run_id="1", state=state, pr=pr)
    codes = {f["code"] for f in findings(tmp_path)}
    if status == "Done" and state == "merged" and pr:
        assert not codes
        result = flow_validate_payload(tmp_path, [request.stem], fixable_only=False, explain=True, apply_fixes=False, dry_run=True, proof=None, proof_source=None)
        assert not [f for f in result["findings"] if f["source"] == "audit"]
    else:
        assert ("ac_no_linked_tasks" in codes) == (status != "Draft")
        assert ("request_missing_dor" in codes) == (status != "Draft")
        if status == "Done":
            assert all("flow record-run" in f["message"] for f in findings(tmp_path) if f["code"] in {"ac_no_linked_tasks", "request_missing_dor"})


def test_execution_evidence_replaces_existing_missing_proof_and_backlog(tmp_path):
    paths = write_ac_traceability_chain(tmp_path)
    request = paths["request"]
    for path in paths.values():
        path.write_text(path.read_text().replace("Status: Ready", "Status: Done"))
    missing_proofs = [f for f in findings(tmp_path) if f["code"] == "ac_missing_task_traceability"]
    assert missing_proofs
    assert all("flow record-run" in f["message"] for f in missing_proofs)
    record_run_payload(tmp_path, request.stem, runner="mission", run_id="1", state="merged", pr="https://example.com/pull/1")
    assert not findings(tmp_path)
    paths["task"].unlink()
    paths["backlog"].unlink()
    request.write_text(request.read_text().replace("- `item_001_demo`\n", ""))
    assert not findings(tmp_path)
    request.write_text(request.read_text().replace("| merged |", "| invalid |"))
    codes = {f["code"] for f in findings(tmp_path)}
    assert {"executions_invalid", "request_missing_dor", "ac_no_linked_backlog"} <= codes


def test_proof_autofix_rescan_keeps_execution_exception(tmp_path):
    paths = write_ac_traceability_chain(tmp_path)
    for path in paths.values():
        other = path.with_name(path.name.replace("001", "002"))
        other.write_text(path.read_text().replace("001", "002"))
        path.write_text(path.read_text().replace("Status: Ready", "Status: Done"))
    request = paths["request"]
    record_run_payload(tmp_path, request.stem, runner="mission", run_id="1", state="merged", pr="https://example.com/pull/1")
    result = audit_payload(tmp_path, autofix_ac_traceability=True, stale_days=0)
    assert result["autofix"]["modified_files"]
    assert not [f for f in result["findings"] if f["path"] == "logics/request/req_001_demo.md"]
