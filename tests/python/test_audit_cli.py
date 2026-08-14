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
from logics_manager.flow import evidence_add_payload, repair_ac_traceability_payload
from logics_manager.flow_evidence import duplicate_proof_ac_ids
from logics_manager.flow import scaffold_request_chain_payload
from logics_manager.flow.docs import DOC_KINDS, _append_doc_section_bullets, _resolve_workflow_source
from logics_manager.ai_context import UNFILLED as AI_CONTEXT_UNFILLED, block as ai_context_block, is_ungroomed
from logics_manager.path_utils import WORKFLOW_DIRS, WORKFLOW_DIR_ALIASES, canonical_workflow_path, duplicate_workflow_dirs
from logics_manager.flow import PlannedDoc, closeout_payload, validate_closeout_payload
from logics_manager.flow_evidence import AC_DEFERRED_PLACEHOLDER, composed_ac_proof, evidence_for_ac, has_ac_proof, has_validation_evidence
from logics_manager.insights import followups_payload, health_payload, product_consistency_payload, render_health, status_payload
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


def test_duplicate_proof_ac_ids_flags_the_ac6_ac7_shift_shape() -> None:
    """item_784/GH#20: the concrete original bug -- two request-ACn lines, both
    self-referential (`This task.`), carrying the exact same proof sentence."""
    text = "\n".join(
        [
            "# AC Traceability",
            "- request-AC6 -> This task. Proof: token aggregation is non-zero, asserted by test_token_totals.",
            "- request-AC7 -> This task. Proof: token aggregation is non-zero, asserted by test_token_totals.",
        ]
    )
    assert duplicate_proof_ac_ids(text) == [("AC6", "AC7")]


def test_duplicate_proof_ac_ids_ignores_orchestration_redirects() -> None:
    """An orchestration task delegating several ACs to the same child item repeats the
    same redirect sentence on purpose -- its target is the child ref, not a
    self-reference, so it is out of scope for this check."""
    text = "\n".join(
        [
            "# AC Traceability",
            "- request-AC1 -> `item_596_demo`. Proof deferred to slice closeout.",
            "- request-AC2 -> `item_596_demo`. Proof deferred to slice closeout.",
        ]
    )
    assert duplicate_proof_ac_ids(text) == []


def test_duplicate_proof_ac_ids_ignores_placeholders() -> None:
    text = "\n".join(
        [
            "# AC Traceability",
            "- request-AC1 -> This task. Proof: TODO -- state how this was verified",
            "- request-AC2 -> This task. Proof: TODO -- state how this was verified",
        ]
    )
    assert duplicate_proof_ac_ids(text) == []


def test_duplicate_proof_ac_ids_allows_distinct_proofs() -> None:
    text = "\n".join(
        [
            "# AC Traceability",
            "- request-AC1 -> This task. Proof: implemented in abc123, per test_one.",
            "- request-AC2 -> This task. Proof: implemented in abc123, per test_two.",
        ]
    )
    assert duplicate_proof_ac_ids(text) == []


def test_audit_reports_duplicate_proof_as_a_warning_not_blocking(tmp_path: Path) -> None:
    """item_784/GH#20: a warning, not a gate -- a prototype run as blocking produced
    437 false positives against this repository's own real corpus (legitimate
    orchestration delegation and single-wave multi-AC proofs), which is why this is
    wired in as a signal for a human to confirm rather than an automated gate."""
    repo_root = tmp_path / "logics-repo"
    for directory in ["request", "backlog"]:
        (repo_root / "logics" / directory).mkdir(parents=True, exist_ok=True)
    (repo_root / "logics" / "backlog" / "item_001_demo.md").write_text(
        "\n".join(
            [
                "## item_001_demo - Demo backlog",
                "> From version: 2.11.6",
                "> Status: Done",
                "> Progress: 100%",
                "> Schema version: 1.0",
                "# Links",
                "- `req_001_demo`",
                "# AC Traceability",
                "- request-AC1 -> This backlog slice. Proof: implemented and validated by the full suite.",
                "- request-AC2 -> This backlog slice. Proof: implemented and validated by the full suite.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    payload = audit_payload(repo_root, group_by_doc=True)

    assert payload["ok"] is True
    assert payload["issue_count"] == 0
    codes_and_severity = {(w["code"], w.get("severity", "warning")) for w in payload["warnings"]}
    assert ("ac_duplicate_proof", "warning") in codes_and_severity


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
    # item_785/GH#21: the finding names the remedy (hand-authored) instead of leaving
    # the operator to run `flow repair mermaid`, get refused, and infer it from there.
    mermaid_warning = next(w for w in payload["warnings"] if w["code"] == "companion_doc_missing_mermaid")
    assert "authored by hand" in mermaid_warning["message"]
    assert "flow repair mermaid does not generate diagrams for product documents" in mermaid_warning["message"]


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


def _anchor_doc(repo_root: Path, slug: str, *, status: str, references: list[str]) -> None:
    (repo_root / "logics" / "request").mkdir(parents=True, exist_ok=True)
    (repo_root / "logics" / "request" / f"req_001_{slug}.md").write_text(
        "\n".join(
            [f"## req_001_{slug} - {slug}", "> From version: 2.11.6", f"> Status: {status}", "> Schema version: 1.0", "# References"]
            + [f"- {reference}" for reference in references]
        )
        + "\n",
        encoding="utf-8",
    )


def test_audit_reports_code_anchors_that_no_longer_resolve(tmp_path: Path) -> None:
    """req_339 AC1/AC2/AC3: paths are decidable, symbols are hints, line numbers are never checked."""
    repo_root = tmp_path / "logics-repo"
    (repo_root / "src").mkdir(parents=True)
    (repo_root / "src" / "real.py").write_text("def kept_symbol():\n    return 1\n# only_in_a_comment is mentioned here\n", encoding="utf-8")
    _anchor_doc(
        repo_root,
        "anchors",
        status="Ready",
        references=["`src/real.py`", "`src/gone.py`", "`kept_symbol`", "`vanished_symbol`", "`only_in_a_comment`", "`src/real.py:9999`"],
    )

    payload = audit_payload(repo_root, skip_ac_traceability=True, skip_gates=True)
    findings = {(f["code"], f["message"]) for f in payload["findings"]}

    # AC1: the missing path, once, named.
    assert ("code_anchor_path_missing", "cited path `src/gone.py` does not exist") in findings
    # An existing path is never reported...
    assert not any("src/real.py" in message for code, message in findings if code == "code_anchor_path_missing")
    # ...and neither is a line number on it (AC3).
    assert not any("9999" in message for _, message in findings)
    # AC2: the symbol is a lower-confidence hint, worded as one, and withheld by default.
    symbol_findings = [f for f in payload["findings"] if f["code"] == "code_anchor_symbol_not_found"]
    assert [f["message"].split("`")[1] for f in symbol_findings] == ["vanished_symbol"]
    assert "a hint that the citation is stale, not a fact" in symbol_findings[0]["message"]
    assert symbol_findings[0]["deferred"] is True
    # A symbol that exists only inside a comment still exists.
    assert not any("only_in_a_comment" in message for _, message in findings)
    # AC5: warnings only, so the audit still passes and the default report stays quiet.
    assert payload["ok"] is True
    assert all(f["severity"] == "warning" for f in payload["findings"])
    assert "a hint that the citation is stale" not in render_audit(repo_root, skip_ac_traceability=True, skip_gates=True)


def test_audit_leaves_closed_documents_code_anchors_alone(tmp_path: Path) -> None:
    """req_339 AC4: a Done document describing code as it was is history."""
    repo_root = tmp_path / "logics-repo"
    (repo_root / "src").mkdir(parents=True)
    _anchor_doc(repo_root, "history", status="Done", references=["`src/long_gone.py`", "`deleted_symbol`"])

    payload = audit_payload(repo_root, skip_ac_traceability=True, skip_gates=True)

    assert not [f for f in payload["findings"] if f["code"].startswith("code_anchor_")]


def test_audit_stays_silent_when_every_code_anchor_resolves(tmp_path: Path) -> None:
    """req_339 AC5: quiet on a healthy corpus, or the check teaches the reader to skim."""
    repo_root = tmp_path / "logics-repo"
    (repo_root / "src").mkdir(parents=True)
    (repo_root / "src" / "real.py").write_text("MAX_RETRIES = 3\n", encoding="utf-8")
    _anchor_doc(repo_root, "healthy", status="Ready", references=["`src/real.py`", "`MAX_RETRIES`", "`src/real.py:1`"])

    report = render_audit(repo_root, skip_ac_traceability=True, skip_gates=True)

    assert "code_anchor" not in report


def _indicator(text: str, key: str) -> str | None:
    return next((line for line in text.splitlines() if line.startswith(f"> {key}:")), None)


def _proof_chain(repo_root: Path) -> Path:
    """A request/backlog/task chain ready to have proof recorded against it."""
    _chain(repo_root, "capture", status="Ready", ac_count=2, proof=False)
    return repo_root / "logics" / "tasks" / "task_001_capture.md"


def test_evidence_add_records_proof_for_one_criterion_without_closing_anything(tmp_path: Path) -> None:
    """req_338 AC1/AC2: capture at the moment the evidence is produced."""
    repo_root = tmp_path / "logics-repo"
    task_path = _proof_chain(repo_root)
    before = task_path.read_text(encoding="utf-8")

    payload = evidence_add_payload(
        repo_root, "task_001_capture", ac_id="ac1", summary="latency measured at 0.57s",
        command="python3 -m timeit run", result="Passed", dry_run=False,
    )

    text = task_path.read_text(encoding="utf-8")
    assert payload["ac"] == "AC1"
    assert payload["record_count"] == 1
    # AC2: the command and its result sit beside the summary, so a reader can tell
    # verification from assertion.
    assert "command: `python3 -m timeit run`" in text
    assert "result: passed" in text
    assert "latency measured at 0.57s" in text
    # AC1: nothing else moved -- no status, no progress, and no other criterion.
    assert _indicator(before, "Status") == _indicator(text, "Status")
    assert _indicator(before, "Progress") == _indicator(text, "Progress")
    assert composed_ac_proof(text, "AC2") is None


def test_evidence_records_accumulate_rather_than_replace(tmp_path: Path) -> None:
    """req_338 AC3: a re-run after a fix is the common case, and both results matter."""
    repo_root = tmp_path / "logics-repo"
    task_path = _proof_chain(repo_root)

    evidence_add_payload(repo_root, "task_001_capture", ac_id="AC1", summary="first run, process exited early", command="pytest -k one", result="failed", dry_run=False)
    second = evidence_add_payload(repo_root, "task_001_capture", ac_id="AC1", summary="re-run after the fix", command="pytest -k one", result="passed", dry_run=False)

    text = task_path.read_text(encoding="utf-8")
    assert second["record_count"] == 2
    assert len(evidence_for_ac(text, "AC1")) == 2
    composed = composed_ac_proof(text, "AC1")
    assert "process exited early" in composed and "re-run after the fix" in composed
    assert composed.index("exited early") < composed.index("re-run"), "records keep their order"


def test_recorded_proof_composes_the_traceability_entry_at_closeout(tmp_path: Path) -> None:
    """req_338 AC4/AC5: records compose; criteria without one behave exactly as today."""
    repo_root = tmp_path / "logics-repo"
    task_path = _proof_chain(repo_root)
    evidence_add_payload(repo_root, "task_001_capture", ac_id="AC1", summary="menu covers the registry", command="pytest -k menu", result="passed", dry_run=False)

    # The whole-request command is unchanged and still available (AC5).
    repair_ac_traceability_payload(repo_root, "req_001_capture", dry_run=False, proof="shared fallback text", proof_source="abc1234")

    lines = [line for line in task_path.read_text(encoding="utf-8").splitlines() if line.startswith("- request-AC")]
    ac1, ac2 = sorted(lines)
    # AC1 got its own record, not the shared sentence.
    assert "menu covers the registry" in ac1 and "shared fallback text" not in ac1
    assert "command: `pytest -k menu`" in ac1
    # AC2 had no record, so it behaves exactly as it did before this change.
    assert "shared fallback text" in ac2


def test_evidence_add_rejects_a_criterion_id_it_cannot_address(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    _proof_chain(repo_root)

    with pytest.raises(SystemExit):
        evidence_add_payload(repo_root, "task_001_capture", ac_id="the first one", summary="x", command=None, result=None, dry_run=False)
    with pytest.raises(SystemExit):
        evidence_add_payload(repo_root, "task_001_capture", ac_id="AC1", summary="   ", command=None, result=None, dry_run=False)


def test_every_workflow_directory_resolves_from_either_spelling() -> None:
    """req_335 AC1/AC4: one derived mapping, so no directory is handled in one form only."""
    # AC4: the alias set is derived from WORKFLOW_DIRS, not written per call site.
    assert set(WORKFLOW_DIR_ALIASES.values()) == {name for name in WORKFLOW_DIRS if not name.startswith(".")}
    for canonical in WORKFLOW_DIRS:
        if canonical.startswith("."):
            continue
        alias = next(key for key, value in WORKFLOW_DIR_ALIASES.items() if value == canonical)
        assert canonical_workflow_path(f"logics/{alias}/doc_001.md") == f"logics/{canonical}/doc_001.md"
        # The canonical form is left exactly as it is.
        assert canonical_workflow_path(f"logics/{canonical}/doc_001.md") == f"logics/{canonical}/doc_001.md"
    # Nothing outside a logics/ directory segment is touched.
    assert canonical_workflow_path("src/task/main.py") == "src/task/main.py"
    assert canonical_workflow_path("task_001_example") == "task_001_example"


def test_workflow_path_alias_resolves_to_the_same_file(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    _chain(repo_root, "alias", status="Ready", ac_count=1, proof=False)

    plural = _resolve_workflow_source(repo_root, DOC_KINDS["task"], "logics/tasks/task_001_alias.md")
    singular = _resolve_workflow_source(repo_root, DOC_KINDS["task"], "logics/task/task_001_alias.md")

    assert plural == singular
    # AC2: resolving an alias creates nothing and renames nothing.
    assert not (repo_root / "logics" / "task").exists()
    assert sorted(p.name for p in (repo_root / "logics").iterdir()) == ["backlog", "request", "tasks"]


def test_health_reports_an_alias_directory_that_exists_beside_its_canonical_form(tmp_path: Path) -> None:
    """req_335 AC3: tolerance must not become ambiguity."""
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "tasks").mkdir(parents=True)

    assert duplicate_workflow_dirs(repo_root) == []

    (repo_root / "logics" / "task").mkdir()

    assert duplicate_workflow_dirs(repo_root) == ["logics/task"]
    assert "logics/task" in render_health(repo_root)


def test_generated_ai_context_asks_to_be_filled_instead_of_restating_the_title() -> None:
    """req_334 AC1/AC2: the one section meant to help an agent must not repeat the title."""
    title = "Keep deferred traceability findings out of the default audit report"
    generated = ai_context_block(title)

    summary = next(line for line in generated if line.startswith("- Summary:"))
    # AC1: not the title, not a fixed sentence wrapping the title.
    assert title.lower() not in summary.lower()
    assert AI_CONTEXT_UNFILLED in summary
    # AC2: keywords describe the subject, not the tool or the act of scaffolding.
    keywords = next(line for line in generated if line.startswith("- Keywords:"))
    assert "deferred" in keywords and "traceability" in keywords and "audit" in keywords
    for tool_word in ("logics-manager", "python runtime", "bundled CLI", "scaffold", "request-draft"):
        assert tool_word not in keywords


def test_the_ungroomed_check_follows_every_generator_template() -> None:
    """req_334 AC3: the drift guard.

    The old check was a hand-maintained copy of templates it did not read, so the
    templates moved and the rule stayed. This fails if a generator's wording changes
    without the placeholder set following it.
    """
    for title in ("Show every Workshop section", "Name every workflow directory the same way"):
        fields = {
            line.split(":", 1)[0].removeprefix("- ").strip().lower(): line.split(":", 1)[1].strip()
            for line in ai_context_block(title)
            if line.startswith("- ")
        }
        for label in ("summary", "use when", "skip when"):
            assert is_ungroomed(fields[label]), f"{label} of a freshly generated block must read as ungroomed"
        # Keywords are genuinely derived, so they are the one field that is not a marker.
        assert not is_ungroomed(fields["keywords"])
    # A groomed block passes cleanly.
    assert not is_ungroomed("Stop the webview Activity view resetting on every refresh")


def test_audit_reports_an_ungroomed_ai_context_without_blocking(tmp_path: Path) -> None:
    """req_334 AC4/AC5: named, repairable, never blocking, and closed docs left alone."""
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    for slug, status in (("fresh", "Draft"), ("shipped", "Done")):
        (repo_root / "logics" / "request" / f"req_001_{slug}.md").write_text(
            "\n".join([f"## req_001_{slug} - {slug}", "> From version: 2.11.6", f"> Status: {status}", "> Schema version: 1.0"] + ai_context_block(slug)) + "\n",
            encoding="utf-8",
        )

    payload = audit_payload(repo_root, skip_ac_traceability=True, skip_gates=True)
    findings = [f for f in payload["findings"] if f["code"] == "ai_context_ungroomed"]

    # AC4: one finding, naming the document, with a repair command.
    assert len(findings) == 1
    assert findings[0]["path"] == "logics/request/req_001_fresh.md"
    assert "req_001_fresh" in findings[0]["repair_command"]
    assert "summary" in findings[0]["message"]
    # AC5: a warning, so this finding can never block. (The Done fixture trips an
    # unrelated `request_done_without_backlog`, which is why `ok` is not asserted here.)
    assert findings[0]["severity"] == "warning"
    assert "ai_context_ungroomed" not in {issue["code"] for issue in payload["issues"]}


def test_grooming_the_ai_context_clears_the_finding(tmp_path: Path) -> None:
    """req_334 AC4: a groomed doc must produce no finding, or the check is just noise."""
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "request" / "req_001_groomed.md").write_text(
        "\n".join([
            "## req_001_groomed - Groomed", "> From version: 2.11.6", "> Status: Draft", "> Schema version: 1.0",
            "# AI Context",
            "- Summary: Stop the webview flipping back to Activity instead of staying on Project on every refresh.",
            "- Keywords: webview, activity-view, refresh, state-reset",
            "- Use when: Changing which view the webview restores after a refresh.",
            "- Skip when: The work concerns what a view renders rather than which one is shown.",
        ]) + "\n",
        encoding="utf-8",
    )

    payload = audit_payload(repo_root, skip_ac_traceability=True, skip_gates=True)

    assert not [f for f in payload["findings"] if f["code"] == "ai_context_ungroomed"]


def test_a_real_ref_evicts_the_empty_placeholder_it_contradicts(tmp_path: Path) -> None:
    """A section cannot claim `none` directly above a real entry.

    `flow deliver` stripped the placeholder itself after appending; every other
    writer -- `scaffold request-chain` among them -- did not, so every request
    scaffolded through that path shipped `- none` beside its own backlog slice, and
    nothing reported it.
    """
    doc = tmp_path / "req_001_demo.md"
    doc.write_text("## req_001_demo - Demo\n\n# Backlog\n- none\n", encoding="utf-8")

    _append_doc_section_bullets(doc, "Backlog", ["`item_001_demo`"], dry_run=False)

    backlog = doc.read_text(encoding="utf-8").splitlines()
    assert backlog[backlog.index("# Backlog") + 1 :] == ["- `item_001_demo`"]


def test_an_empty_section_keeps_its_placeholder(tmp_path: Path) -> None:
    """Eviction happens only when something real replaces it."""
    doc = tmp_path / "req_001_demo.md"
    doc.write_text("## req_001_demo - Demo\n\n# Backlog\n- none\n", encoding="utf-8")

    _append_doc_section_bullets(doc, "Backlog", [], dry_run=False)

    assert "- none" in doc.read_text(encoding="utf-8")


def test_promoting_a_request_clears_the_placeholder_it_wrote(tmp_path: Path) -> None:
    """The real path: `flow new` writes `- none`, `promote` appends the slice.

    `flow deliver` stripped the placeholder itself after appending; `promote` did
    not, so every request promoted this way carried `- none` directly above its own
    backlog ref, and neither lint nor audit mentioned it.
    """
    doc = tmp_path / "req_001_demo.md"
    doc.write_text("## req_001_demo - Demo\n\n# Backlog\n- none\n\n# References\n- none\n", encoding="utf-8")

    _append_doc_section_bullets(doc, "Backlog", ["`item_001_demo`"], dry_run=False)

    text = doc.read_text(encoding="utf-8")
    backlog = text.split("# Backlog", 1)[1].split("# ", 1)[0].strip().splitlines()
    assert backlog == ["- `item_001_demo`"]
    # A section nothing was appended to keeps its placeholder: eviction is local.
    assert "# References\n- none" in text


def test_recorded_proof_composes_over_the_scaffold_placeholder_but_never_over_authored_text(tmp_path: Path) -> None:
    """req_338 follow-up: composition has to survive a scaffolded task.

    `flow scaffold request-chain` writes a generated `Proof deferred to slice closeout.`
    line per criterion. Skipping anything that already had a line meant recorded proof
    never composed into a scaffolded task -- which is the common case, and is how
    req_341 reached closeout with seven blocking findings despite full evidence.
    """
    repo_root = tmp_path / "logics-repo"
    task_path = _proof_chain(repo_root)
    task_path.write_text(
        task_path.read_text(encoding="utf-8").replace(
            "# AC Traceability",
            "\n".join([
                "# AC Traceability",
                f"- request-AC1 -> `item_001_capture`. {AC_DEFERRED_PLACEHOLDER}",
                "- request-AC2 -> This task. Proof: measured by hand on a second host, kept.",
            ]),
        ),
        encoding="utf-8",
    )
    evidence_add_payload(repo_root, "task_001_capture", ac_id="AC1", summary="the real thing", command="pytest -k one", result="passed", dry_run=False)
    evidence_add_payload(repo_root, "task_001_capture", ac_id="AC2", summary="should not overwrite", command="pytest -k two", result="passed", dry_run=False)

    repair_ac_traceability_payload(repo_root, "req_001_capture", dry_run=False, proof="shared", proof_source="abc1234")

    lines = [line for line in task_path.read_text(encoding="utf-8").splitlines() if line.startswith("- request-AC")]
    ac1 = next(line for line in lines if "AC1" in line)
    ac2 = next(line for line in lines if "AC2" in line)
    # Generated wording is replaced by the record it was standing in for...
    assert AC_DEFERRED_PLACEHOLDER not in ac1
    assert "the real thing" in ac1 and "pytest -k one" in ac1
    # ...and authored text is left strictly alone, record or no record.
    assert "measured by hand on a second host, kept." in ac2
    assert "should not overwrite" not in ac2
    # One line per criterion: replacing must not append a second.
    assert len([line for line in lines if "AC1" in line]) == 1


def _chain_with_partial_coverage(repo_root: Path, *, request_acs: int, covered_acs: int, status: str = "Ready") -> None:
    """A request whose chain accounts for only the first `covered_acs` criteria."""
    for directory in ("request", "backlog", "tasks"):
        (repo_root / "logics" / directory).mkdir(parents=True, exist_ok=True)
    (repo_root / "logics" / "request" / "req_001_drift.md").write_text(
        "\n".join(
            ["## req_001_drift - Drift", "> From version: 2.11.6", f"> Status: {status}", "> Schema version: 1.0", "# Acceptance criteria"]
            + [f"- AC{n}: Demo." for n in range(1, request_acs + 1)]
            + ["# Backlog", "- `item_001_drift`"]
        )
        + "\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "backlog" / "item_001_drift.md").write_text(
        "\n".join(
            ["## item_001_drift - Drift slice", "> From version: 2.11.6", "> Status: Ready", "> Progress: 0%", "> Schema version: 1.0", "# AC Traceability"]
            + [f"- request-AC{n} -> This backlog slice. Proof: covered." for n in range(1, covered_acs + 1)]
            + ["# Links", "- `req_001_drift`", "- `task_001_drift`"]
        )
        + "\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "tasks" / "task_001_drift.md").write_text(
        "\n".join(
            ["## task_001_drift - Drift task", "> From version: 2.11.6", "> Status: Ready", "> Progress: 0%", "> Schema version: 1.0", "# AC Traceability"]
            + [f"- request-AC{n} -> This task. Proof: covered." for n in range(1, covered_acs + 1)]
            + ["# Links", "- `item_001_drift`"]
        )
        + "\n",
        encoding="utf-8",
    )


def test_a_criterion_no_linked_document_names_is_reported_before_closeout(tmp_path: Path) -> None:
    """req_340/item_703: the item_695 case, reproduced.

    A request gained AC6 at grooming; its slice still carried five. Nothing said so
    until a closeout gate demanded proof for the sixth, at the worst moment.
    """
    repo_root = tmp_path / "logics-repo"
    _chain_with_partial_coverage(repo_root, request_acs=6, covered_acs=5)

    payload = audit_payload(repo_root, skip_gates=True)
    findings = [f for f in payload["findings"] if f["code"] == "ac_not_covered_by_chain"]

    assert len(findings) == 1
    # AC5: names the criterion and the documents that were checked.
    assert "`AC6`" in findings[0]["message"]
    assert "`item_001_drift`" in findings[0]["message"] and "`task_001_drift`" in findings[0]["message"]
    for covered in ("`AC1`", "`AC2`", "`AC5`"):
        assert covered not in findings[0]["message"]
    # AC6: a warning, so it cannot block while the work is still in flight.
    assert findings[0]["severity"] == "warning"
    assert payload["ok"] is True
    # Not deferred: adding the missing line needs no evidence, so it is shown now.
    assert findings[0]["deferred"] is False


def test_a_fully_covered_chain_reports_no_uncovered_criterion(tmp_path: Path) -> None:
    """req_340/item_703 AC6: silent on complete coverage, or the check is just noise."""
    repo_root = tmp_path / "logics-repo"
    _chain_with_partial_coverage(repo_root, request_acs=4, covered_acs=4)

    payload = audit_payload(repo_root, skip_gates=True)

    assert not [f for f in payload["findings"] if f["code"] == "ac_not_covered_by_chain"]


def test_coverage_is_about_the_line_existing_not_about_the_proof(tmp_path: Path) -> None:
    """The finding beside it already covers proof; this one is about the chain knowing."""
    repo_root = tmp_path / "logics-repo"
    _chain_with_partial_coverage(repo_root, request_acs=2, covered_acs=2)
    item = repo_root / "logics" / "backlog" / "item_001_drift.md"
    task = repo_root / "logics" / "tasks" / "task_001_drift.md"
    for path in (item, task):
        path.write_text(path.read_text(encoding="utf-8").replace("Proof: covered.", "Proof deferred to slice closeout."), encoding="utf-8")

    payload = audit_payload(repo_root, skip_gates=True)

    # Unproven, and said so elsewhere; but the chain does name both criteria.
    assert not [f for f in payload["findings"] if f["code"] == "ac_not_covered_by_chain"]
    assert [f for f in payload["findings"] if f["code"].startswith("ac_missing_")]


def test_a_closed_request_is_not_nagged_about_coverage(tmp_path: Path) -> None:
    """Reported before closeout is the point; after it, the record is history."""
    repo_root = tmp_path / "logics-repo"
    _chain_with_partial_coverage(repo_root, request_acs=6, covered_acs=5, status="Done")

    payload = audit_payload(repo_root, skip_gates=True)

    assert not [f for f in payload["findings"] if f["code"] == "ac_not_covered_by_chain"]
