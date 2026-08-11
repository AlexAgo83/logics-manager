from __future__ import annotations

import json
from importlib import metadata as importlib_metadata
import os
import re
import subprocess
import sys
import tempfile
import threading
import tomllib
from http.client import HTTPConnection
from pathlib import Path
from types import SimpleNamespace

import pytest

from logics_manager.config import DEFAULT_LOGICS_CONFIG, load_repo_config, render_config_show
from logics_manager.audit import audit_payload, render_audit
from logics_manager.index import index_payload, render_index
from logics_manager.lint import lint_payload, render_lint
from logics_manager.doctor import doctor_payload, render_doctor
from logics_manager.bootstrap import bootstrap_payload
from logics_manager.cli import main
from logics_manager.flow import PlannedDoc, closeout_payload, validate_closeout_payload
from logics_manager.flow_evidence import has_ac_proof, has_validation_evidence
from logics_manager.insights import followups_payload, health_payload, product_consistency_payload, status_payload
from logics_manager.sync import search_logics_docs_payload
from logics_manager import viewer as viewer_module
from logics_manager.viewer import (
    build_viewer_url,
    cdx_artifact_preview_payload,
    cdx_mission_apply_plan_payload,
    cdx_mission_plan_payload,
    cdx_mission_run_payload,
    cdx_remove_payload,
    cdx_history_payload,
    cdx_run_report_payload,
    cdx_runs_payload,
    cdx_status_payload,
    ci_status_payload,
    collect_viewer_items,
    create_request_from_cdx_report,
    create_viewer_server,
    edit_doc_payload,
    file_preview_payload,
    github_repo_url,
    git_diff_payload,
    git_file_preview_payload,
    git_status_payload,
    normalize_viewer_focus_target,
    open_file_payload,
    open_repo_folder_payload,
    read_doc_payload,
    viewer_project_registry,
    viewer_project_capabilities,
    VIEWER_MUTATING_ROUTES,
    WorkshopSessionRegistry,
    WorkshopTerminalRegistry,
    _append_lan_token,
    _render_qr_lines,
    render_start_status,
    workshop_commands_payload,
    workshop_terminals_available,
    workspace_preview_payload,
    workspace_tree_payload,
)
from logics_manager.update_check import get_update_info, is_newer_version
from flow_fixtures import write_ac_traceability_chain

from conftest import (
    _run_logics_manager_subprocess,
    _write_minimal_product_doc,
    _write_minimal_workflow_doc,
)


def test_render_audit_reports_ok_for_minimal_consistent_repo(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)

    _write_minimal_workflow_doc(
        repo_root / "logics" / "request" / "req_001_demo.md",
        title="Demo request",
        kind="request",
        status="Draft",
        links=["item_001_demo_item"],
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "backlog" / "item_001_demo_item.md",
        title="Demo backlog",
        kind="backlog",
        status="Ready",
        links=["req_001_demo"],
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "tasks" / "task_001_demo_task.md",
        title="Demo task",
        kind="task",
        status="Ready",
        links=["item_001_demo_item"],
    )

    payload = audit_payload(repo_root)

    assert payload["ok"] is True
    assert payload["issue_count"] == 0
    assert payload["workflow_doc_count"] == 3
    assert '"ok": true' in render_audit(repo_root, output_format="json")


def test_render_audit_reports_stale_pending_doc(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    doc_path = repo_root / "logics" / "request" / "req_001_demo.md"
    _write_minimal_workflow_doc(
        doc_path,
        title="Demo request",
        kind="request",
        status="Ready",
        links=[],
    )
    past = 1_600_000_000
    os.utime(doc_path, (past, past))

    payload = audit_payload(repo_root, stale_days=30, skip_ac_traceability=True, skip_gates=True)

    assert payload["ok"] is False
    assert payload["issue_count"] == 1
    assert payload["issues"][0]["code"] == "stale_pending_doc"


def test_audit_active_view_ignores_terminal_doc_blockers(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    _write_minimal_workflow_doc(
        repo_root / "logics" / "backlog" / "item_001_withdrawn.md",
        title="Withdrawn",
        kind="backlog",
        status="Obsolete",
        links=[],
    )

    full = audit_payload(repo_root, skip_ac_traceability=True, skip_gates=True)
    active = audit_payload(repo_root, skip_ac_traceability=True, skip_gates=True, active=True)

    assert full["issue_count"] == 1
    assert active["issue_count"] == 0
    assert "View: active non-terminal docs" in render_audit(repo_root, skip_ac_traceability=True, skip_gates=True, active=True)


def test_audit_structure_autofix_preserves_unrelated_findings(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    request_path = repo_root / "logics" / "request" / "req_001_demo.md"
    backlog_path = repo_root / "logics" / "backlog" / "item_001_orphan.md"
    _write_minimal_workflow_doc(request_path, title="Demo request", kind="request", status="Ready", links=[])
    _write_minimal_workflow_doc(backlog_path, title="Orphan backlog", kind="backlog", status="Ready", links=[])

    payload = audit_payload(repo_root, autofix_structure=True, skip_ac_traceability=True, group_by_doc=True)

    issue_codes = {issue["code"] for issue in payload["issues"]}
    assert "backlog_orphan_no_request" in issue_codes
    assert "request_dor_unchecked" not in issue_codes


def test_validation_evidence_rejects_substring_false_positives() -> None:
    assert (
        has_validation_evidence(
            "\n".join(
                [
                    "## task_001_demo - Demo task",
                    "# Validation",
                    "- blocked by bypass discussion",
                    "- broken test command still pending",
                ]
            )
        )
        is False
    )
    assert (
        has_validation_evidence(
            "\n".join(
                [
                    "## task_001_demo - Demo task",
                    "# Validation",
                    "- command: `python3.11 -m pytest -q` | result: passed | date: 2026-06-20",
                ]
            )
        )
        is True
    )


def test_ac_proof_requires_same_line_for_matching_ac() -> None:
    assert has_ac_proof("- request-AC1 -> This task. Proof: validated by regression.", "AC1") is True
    assert has_ac_proof("- AC1 is mentioned here.\n- Proof: validated by unrelated note.", "AC1") is False
    assert has_ac_proof("- request-AC10 -> This task. Proof: validates AC10.", "AC1") is False


def test_audit_keeps_legacy_ac_proof_compatibility_but_enforces_new_same_line_proof(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    for directory in ["request", "backlog", "tasks"]:
        (repo_root / "logics" / directory).mkdir(parents=True, exist_ok=True)

    def write_chain(ref_suffix: str, from_version: str) -> None:
        request_ref = f"req_001_{ref_suffix}"
        item_ref = f"item_001_{ref_suffix}"
        task_ref = f"task_001_{ref_suffix}"
        (repo_root / "logics" / "request" / f"{request_ref}.md").write_text(
            "\n".join(
                [
                    f"## {request_ref} - Demo request",
                    f"> From version: {from_version}",
                    "> Status: Done",
                    "> Schema version: 1.0",
                    "# Acceptance criteria",
                    "- AC1: Demo.",
                    "# Backlog",
                    f"- `{item_ref}`",
                ]
            )
            + "\n",
            encoding="utf-8",
        )
        (repo_root / "logics" / "backlog" / f"{item_ref}.md").write_text(
            "\n".join(
                [
                    f"## {item_ref} - Demo backlog",
                    f"> From version: {from_version}",
                    "> Status: Done",
                    "> Progress: 100%",
                    "> Schema version: 1.0",
                    "# Links",
                    f"- `{request_ref}`",
                    f"- `{task_ref}`",
                    "# AC Traceability",
                    "- AC1 is mentioned here.",
                    "- Proof: legacy doc-wide proof.",
                ]
            )
            + "\n",
            encoding="utf-8",
        )
        (repo_root / "logics" / "tasks" / f"{task_ref}.md").write_text(
            "\n".join(
                [
                    f"## {task_ref} - Demo task",
                    f"> From version: {from_version}",
                    "> Status: Done",
                    "> Progress: 100%",
                    "> Schema version: 1.0",
                    "# Links",
                    f"- `{item_ref}`",
                    "# AC Traceability",
                    "- AC1 is mentioned here.",
                    "- Proof: legacy doc-wide proof.",
                    "# Definition of Done (DoD)",
                    "- [x] Done.",
                ]
            )
            + "\n",
            encoding="utf-8",
        )

    write_chain("legacy", "2.11.5")
    write_chain("strict", "2.11.6")

    payload = audit_payload(repo_root, legacy_cutoff_version="1.1.0", skip_gates=True)
    issues_by_path = {}
    for issue in payload["issues"]:
        issues_by_path.setdefault(issue["path"], set()).add(issue["code"])

    assert "logics/request/req_001_legacy.md" not in issues_by_path
    assert issues_by_path["logics/request/req_001_strict.md"] == {
        "ac_missing_item_traceability",
        "ac_missing_task_traceability",
    }


def test_audit_defers_ac_traceability_proof_until_a_linked_task_is_done(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    for directory in ["request", "backlog", "tasks"]:
        (repo_root / "logics" / directory).mkdir(parents=True, exist_ok=True)
    request_ref, item_ref, task_ref = "req_001_demo", "item_001_demo", "task_001_demo"
    (repo_root / "logics" / "request" / f"{request_ref}.md").write_text(
        "\n".join(
            [
                f"## {request_ref} - Demo request",
                "> From version: 2.11.6",
                "> Status: Draft",
                "> Schema version: 1.0",
                "# Acceptance criteria",
                "- AC1: Demo.",
                "# Backlog",
                f"- `{item_ref}`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "backlog" / f"{item_ref}.md").write_text(
        "\n".join(
            [
                f"## {item_ref} - Demo backlog",
                "> From version: 2.11.6",
                "> Status: Ready",
                "> Progress: 0%",
                "> Schema version: 1.0",
                "# Links",
                f"- `{request_ref}`",
                f"- `{task_ref}`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    task_path = repo_root / "logics" / "tasks" / f"{task_ref}.md"
    task_path.write_text(
        "\n".join(
            [
                f"## {task_ref} - Demo task",
                "> From version: 2.11.6",
                "> Status: Ready",
                "> Progress: 0%",
                "> Schema version: 1.0",
                "# Links",
                f"- `{item_ref}`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    # Dev-ready chain (no linked task Done): proof-required findings are
    # deferred to non-blocking warnings, and the audit is OK.
    payload = audit_payload(repo_root, skip_gates=True)
    assert payload["ok"] is True
    assert "ac_missing_task_traceability" not in {issue["code"] for issue in payload["issues"]}
    deferred = [w for w in payload["warnings"] if w["code"] == "ac_missing_task_traceability"]
    assert deferred, "deferred traceability should surface as a warning"
    # Actionable next step (AC3): the warning carries the exact repair command.
    assert all("--apply-fixes --proof" in w.get("repair_command", "") for w in deferred)

    # Once a linked task is Done, the same gap is genuinely blocking.
    task_path.write_text(task_path.read_text(encoding="utf-8").replace("> Status: Ready", "> Status: Done"), encoding="utf-8")
    payload_done = audit_payload(repo_root, skip_gates=True)
    assert payload_done["ok"] is False
    assert "ac_missing_task_traceability" in {issue["code"] for issue in payload_done["issues"]}


def test_audit_accepts_variable_width_workflow_refs(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    _write_minimal_workflow_doc(
        repo_root / "logics" / "request" / "req_1000_demo.md",
        title="Demo request",
        kind="request",
        status="Draft",
        links=["item_1000_demo_item"],
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "backlog" / "item_1000_demo_item.md",
        title="Demo backlog",
        kind="backlog",
        status="Ready",
        links=["req_1000_demo", "task_1000_demo_task"],
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "tasks" / "task_1000_demo_task.md",
        title="Demo task",
        kind="task",
        status="Ready",
        links=["item_1000_demo_item"],
    )

    payload = audit_payload(repo_root, skip_ac_traceability=True, skip_gates=True)

    assert payload["ok"] is True
    assert payload["issue_count"] == 0


def test_audit_reports_early_companion_mermaid_and_link_gaps_as_warnings(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "product").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product brief",
        status="Proposed",
    )

    payload = audit_payload(repo_root, group_by_doc=True)
    output = render_audit(repo_root, group_by_doc=True)

    assert payload["ok"] is True
    assert payload["can_continue"] is True
    assert payload["release_ready"] is False
    assert payload["issue_count"] == 0
    assert payload["warning_count"] == 2
    assert {warning["code"] for warning in payload["warnings"]} == {"companion_doc_missing_mermaid", "companion_doc_missing_primary_link"}
    assert "Workflow audit: OK (warnings)" in output
    assert "WARNING: [companion_doc_missing_mermaid]" in output


def test_strict_audit_blocks_companion_mermaid_and_link_gaps(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "product").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product brief",
        status="Proposed",
    )

    payload = audit_payload(repo_root, governance_profile="strict", group_by_doc=True)

    assert payload["ok"] is False
    assert payload["can_continue"] is False
    assert payload["issue_count"] == 2
    assert payload["warning_count"] == 0
    assert {issue["code"] for issue in payload["issues"]} == {"companion_doc_missing_mermaid", "companion_doc_missing_primary_link"}


@pytest.mark.parametrize("output_args", [[], ["--format", "json"]])
def test_module_audit_subprocess_returns_nonzero_for_failed_payload(tmp_path: Path, output_args: list[str]) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "product").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product brief",
        status="Proposed",
    )

    result = _run_logics_manager_subprocess(repo_root, ["audit", "--governance-profile", "strict", *output_args])

    assert result.returncode == 1
    assert result.stderr == ""
    if output_args:
        payload = json.loads(result.stdout)
        assert payload["ok"] is False
        assert payload["issue_count"] == 2
    else:
        assert "Workflow audit: FAILED" in result.stdout


def _chain(repo_root: Path, slug: str, *, status: str, ac_count: int, proof: bool, extra_request: str = "") -> None:
    """One request/backlog/task chain, linked only through its declared sections."""
    for directory in ["request", "backlog", "tasks"]:
        (repo_root / "logics" / directory).mkdir(parents=True, exist_ok=True)
    request_ref, item_ref, task_ref = f"req_001_{slug}", f"item_001_{slug}", f"task_001_{slug}"
    acs = [f"AC{index}" for index in range(1, ac_count + 1)]
    (repo_root / "logics" / "request" / f"{request_ref}.md").write_text(
        "\n".join(
            [f"## {request_ref} - {slug} request", "> From version: 2.11.6", "> Status: Draft", "> Schema version: 1.0", "# Acceptance criteria"]
            + [f"- {ac}: Demo." for ac in acs]
            + ["# Context", extra_request, "# Backlog", f"- `{item_ref}`"]
        )
        + "\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "backlog" / f"{item_ref}.md").write_text(
        "\n".join(
            [f"## {item_ref} - {slug} backlog", "> From version: 2.11.6", "> Status: Ready", "> Progress: 0%", "> Schema version: 1.0", "# AC Traceability"]
            + ([f"- request-{ac} -> This item. Proof: measured and checked. Source: `abc1234`" for ac in acs] if proof else [])
            + ["# Links", f"- `{request_ref}`", f"- `{task_ref}`"]
        )
        + "\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "tasks" / f"{task_ref}.md").write_text(
        "\n".join(
            [f"## {task_ref} - {slug} task", "> From version: 2.11.6", f"> Status: {status}", "> Progress: 0%", "> Schema version: 1.0", "# AC Traceability"]
            + ([f"- request-{ac} -> This task. Proof: measured and checked. Source: `abc1234`" for ac in acs] if proof else [])
            + ["# Links", f"- `{item_ref}`"]
        )
        + "\n",
        encoding="utf-8",
    )


def test_prose_citation_of_a_done_chain_leaves_findings_deferred(tmp_path: Path) -> None:
    """req_337 AC1/AC2: naming prior art must not adopt its lifecycle.

    Deferred findings turn blocking as soon as any linked task is Done, so citing a
    finished chain used to flip a brand-new Draft request's findings to blocking for
    work nobody had started.
    """
    repo_root = tmp_path / "logics-repo"
    _chain(repo_root, "prior", status="Done", ac_count=4, proof=True)
    # The new chain merely *mentions* the finished one, in narrative prose.
    _chain(repo_root, "fresh", status="Ready", ac_count=5, proof=False, extra_request="- Prior art: `item_001_prior` did this first.")

    payload = audit_payload(repo_root, skip_gates=True)

    fresh = [issue for issue in payload["issues"] if "fresh" in issue["path"]]
    assert fresh == [], "a prose citation must not make a fresh chain's findings blocking"
    deferred = {w["code"] for w in payload["warnings"] if "req_001_fresh" in w["path"]}
    assert "ac_missing_task_traceability" in deferred


def test_ac_ids_shared_across_unrelated_chains_stay_unproven_on_both_sides(tmp_path: Path) -> None:
    """req_337 AC3: proof is matched by AC id, and every document numbers from AC1."""
    repo_root = tmp_path / "logics-repo"
    _chain(repo_root, "prior", status="Done", ac_count=4, proof=True)
    _chain(repo_root, "fresh", status="Done", ac_count=5, proof=False, extra_request="- Prior art: `item_001_prior` proved AC1..AC4.")

    payload = audit_payload(repo_root, skip_gates=True)

    unproven = sorted(
        issue["message"].split("`")[1]
        for issue in payload["issues"]
        if issue["code"] == "ac_missing_task_traceability" and "req_001_fresh" in issue["path"]
    )
    # All five, not just AC5: the cited chain's AC1..AC4 are different criteria.
    assert unproven == ["AC1", "AC2", "AC3", "AC4", "AC5"]


def test_prose_only_lineage_is_announced_once_per_document(tmp_path: Path) -> None:
    """req_337 AC4: tightening must say what it stopped counting."""
    repo_root = tmp_path / "logics-repo"
    _chain(repo_root, "prior", status="Done", ac_count=1, proof=True)
    _chain(repo_root, "fresh", status="Ready", ac_count=1, proof=False, extra_request="- See `item_001_prior`, and `item_001_prior` again.")

    payload = audit_payload(repo_root, skip_gates=True)

    announced = [w for w in payload["warnings"] if w["code"] == "lineage_mentioned_but_not_declared"]
    assert len(announced) == 1
    assert "req_001_fresh" in announced[0]["path"]
    assert "item_001_prior" in announced[0]["message"]
    assert "# Backlog" in announced[0]["message"]
    # A declared link is never announced.
    assert all("req_001_prior" not in w["path"] for w in announced)


def test_deferred_findings_are_withheld_from_the_default_report(tmp_path: Path) -> None:
    """req_333: a corpus whose only findings are deferred must read as clean.

    Three states, since the risk is not the noise but the genuine finding that gets
    skimmed past because it arrived alongside eight expected ones.
    """
    repo_root = tmp_path / "logics-repo"
    _chain(repo_root, "fresh", status="Ready", ac_count=5, proof=False)

    # 1. Only deferred findings: no per-finding line, one count line, and exit-neutral.
    default = render_audit(repo_root, skip_gates=True)
    assert "proof is deferred" not in default
    assert "Deferred findings withheld: 10 (expected at task closeout; show with --include-deferred)" in default
    assert audit_payload(repo_root, skip_gates=True)["ok"] is True

    # 2. A real finding alongside them stays visible.
    (repo_root / "logics" / "backlog" / "item_002_orphan.md").write_text(
        "\n".join(["## item_002_orphan - Orphan", "> From version: 2.11.6", "> Status: Ready", "> Progress: 0%", "> Schema version: 1.0"]) + "\n",
        encoding="utf-8",
    )
    mixed = render_audit(repo_root, skip_gates=True)
    assert "backlog_orphan_no_request" in mixed
    assert "proof is deferred" not in mixed
    assert "Deferred findings withheld: 10" in mixed

    # 3. --include-deferred restores the per-finding output.
    verbose = render_audit(repo_root, skip_gates=True, include_deferred=True)
    assert verbose.count("proof is deferred") == 10
    assert "Deferred findings withheld" not in verbose

    # JSON carries them regardless of the flag, so tooling loses nothing.
    payload = audit_payload(repo_root, skip_gates=True)
    assert payload["deferred_count"] == 10
    assert all(finding["deferred"] for finding in payload["warnings"] if "traceability proof is deferred" in finding["message"])


def test_withholding_never_hides_a_blocking_finding(tmp_path: Path) -> None:
    """req_333 AC4: withholding is presentation only — severity and exit code are untouched."""
    repo_root = tmp_path / "logics-repo"
    _chain(repo_root, "done", status="Done", ac_count=2, proof=False)

    payload = audit_payload(repo_root, skip_gates=True)
    report = render_audit(repo_root, skip_gates=True)

    # A Done linked task makes the same gap genuinely blocking, so it is not deferred
    # and not withheld.
    assert payload["ok"] is False
    assert payload["deferred_count"] == 0
    assert "missing task-level traceability with proof" in report
    assert "Deferred findings withheld" not in report
