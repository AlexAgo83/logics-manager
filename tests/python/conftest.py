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
    render_start_status,
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


def create_viewer_server_or_skip(repo_root: Path):
    try:
        return create_viewer_server(repo_root, host="127.0.0.1", port=0)
    except PermissionError as exc:
        pytest.skip(f"local socket bind unavailable in this environment: {exc}")


def _cdx_test_status_response(args: list[str], sessions: list[dict[str, object]] | None = None) -> subprocess.CompletedProcess[str] | None:
    session_rows = sessions or [{"id": "work"}]
    if args == ["cdx", "status", "--json"]:
        return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": session_rows}), "")
    if len(args) == 4 and args[0:2] == ["cdx", "can-resume"] and args[3] == "--json":
        return subprocess.CompletedProcess(args, 0, json.dumps({"resumable": False}), "")
    return None


def _write_minimal_workflow_doc(path: Path, *, title: str, kind: str, status: str, links: list[str]) -> None:
    links_text = "\n".join(f"- {ref}" for ref in links) if links else "- none"
    path.write_text(
        "\n".join(
            [
                f"## {path.stem} - {title}",
                f"> Status: {status}",
                "> Schema version: 1.0",
                "# Links",
                links_text,
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def _write_minimal_lint_doc(path: Path, *, title: str, status: str, include_progress: bool) -> None:
    lines = [
        f"## {path.stem} - {title}",
        f"> Status: {status}",
        "> From version: 1.0.0",
        "> Understanding: 100%",
        "> Confidence: 100%",
    ]
    if include_progress:
        lines.append("> Progress: 0%")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_minimal_product_doc(path: Path, *, title: str, status: str, body: str = "") -> None:
    path.write_text(
        "\n".join(
            [
                f"## {path.stem} - {title}",
                "> Date: 2026-06-05",
                f"> Status: {status}",
                "> Related request: (none yet)",
                "> Related backlog: (none yet)",
                "> Related task: (none yet)",
                "> Related architecture: (none yet)",
                "> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.",
                "",
                "# Overview",
                body or "Early product framing without complete lineage yet.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def _write_minimal_architecture_doc(path: Path, *, title: str, status: str, body: str = "") -> None:
    path.write_text(
        "\n".join(
            [
                f"## {path.stem} - {title}",
                "> Date: 2026-06-05",
                f"> Status: {status}",
                "> Drivers: Keep the decision record explicit.",
                "> Related request: (none yet)",
                "> Related backlog: (none yet)",
                "> Related task: (none yet)",
                "> Reminder: Update status, linked refs, context, decision, consequences, and supersession markers when you edit this ADR.",
                "",
                "# Context",
                body or "Decision context.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def _write_minimal_spec_doc(path: Path, *, title: str, status: str) -> None:
    path.write_text(
        "\n".join(
            [
                f"## {path.stem} - {title}",
                "> From version: 1.0.0",
                f"> Status: {status}",
                "> Understanding: 100%",
                "> Confidence: 100%",
                "",
                "# Overview",
                "Spec context.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def _write_subprocess_json_repo(repo_root: Path) -> None:
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")
    _write_minimal_lint_doc(
        repo_root / "logics" / "request" / "req_001_demo.md",
        title="Demo request",
        status="Draft",
        include_progress=False,
    )
    _write_minimal_lint_doc(
        repo_root / "logics" / "backlog" / "item_001_demo.md",
        title="Demo backlog",
        status="Ready",
        include_progress=True,
    )
    _write_minimal_lint_doc(
        repo_root / "logics" / "tasks" / "task_001_demo.md",
        title="Demo task",
        status="Ready",
        include_progress=True,
    )


def _run_logics_manager_subprocess(repo_root: Path, argv: list[str]) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    source_root = Path(__file__).resolve().parents[2]
    env["PYTHONPATH"] = os.pathsep.join([str(source_root), env.get("PYTHONPATH", "")]).rstrip(os.pathsep)
    return subprocess.run(
        [sys.executable, "-m", "logics_manager", *argv],
        cwd=repo_root,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


def _write_ac_split_request(path: Path) -> None:
    path.write_text(
        "\n".join(
            [
                "## req_001_demo - Demo Request",
                "> Status: Draft",
                "> From version: 1.0.0",
                "> Schema version: 1.0",
                "# Needs",
                "- Clarify scope",
                "# Context",
                "- Context note",
                "# Acceptance criteria",
                "- AC1: Generate mapped slice A.",
                "- AC2: Generate mapped slice B.",
                "- AC3: Leave this AC for later.",
                "# Backlog",
                "- none",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def _write_request_chain_input(path: Path) -> None:
    path.write_text(
        json.dumps(
            {
                "title": "Scaffold Demo",
                "request": {
                    "needs": ["Create a development-ready scaffold."],
                    "context": ["This fixture should avoid generic generated text."],
                    "acceptance_criteria": [
                        "AC1: The request chain is scaffolded.",
                        "AC2: Context pack handoff is available.",
                    ],
                },
                "product": {
                    "title": "Scaffold Demo Product",
                    "overview": "Structured product context for scaffold tests.",
                    "goals": ["Reduce manual rewrites."],
                    "non_goals": ["Implementing generated tasks."],
                },
                "backlog_items": [
                    {
                        "title": "First Scaffold Slice",
                        "problem": ["Implement the first generated slice."],
                        "scope_in": ["request-chain generation"],
                        "scope_out": ["sibling validation surfaces"],
                        "acceptance_criteria": ["AC1: First slice is ready."],
                        "request_acs": ["AC1"],
                    },
                    {
                        "title": "Context Pack Slice",
                        "problem": ["Generate handoff context."],
                        "acceptance_criteria": ["AC1: Context pack exists."],
                        "request_acs": ["AC2"],
                    },
                ],
                "orchestration_task": {
                    "title": "Orchestrate Scaffold Demo",
                    "plan": ["Inspect generated docs.", "Run lint and audit."],
                },
            },
            indent=2,
        ),
        encoding="utf-8",
    )
