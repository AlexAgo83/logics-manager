"""Regression tests for req_308, honest outcomes across audit, help, and closeout.

Each test pins a defect recorded in prod_056. The scenarios are the ones that were
reproduced by hand: an abandoned request asked to justify itself as delivered, a flag
the tool recommends but its help denies, a closeout that reports failure after closing,
and a re-baseline that cannot clear the finding it is recommended for.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from logics_manager.cli import main
from logics_manager.flow import closeout_payload
from logics_manager.lint import lint_payload
from logics_manager.sync import update_workflow_indicators_payload


def _git(args: list[str], cwd: Path) -> None:
    subprocess.run(["git", *args], cwd=cwd, check=True, timeout=60, capture_output=True)


def _git_repo(tmp_path: Path) -> Path:
    root = tmp_path / "logics-repo"
    (root / "logics").mkdir(parents=True, exist_ok=True)
    _git(["init", "-q"], root)
    _git(["config", "user.email", "test@example.invalid"], root)
    _git(["config", "user.name", "Test"], root)
    return root


def _write_task(root: Path, ref: str, body: str) -> Path:
    directory = root / "logics" / "tasks"
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{ref}.md"
    path.write_text(
        "\n".join(
            [
                f"## {ref} - Probe",
                "> From version: 2.20.0",
                "> Schema version: 1.0",
                "> Status: In progress",
                "> Understanding: 80%",
                "> Confidence: 80%",
                "> Progress: 50%",
                "> Complexity: Low",
                "> Theme: Probe",
                "> Reminder: Update status.",
                "",
                "# Plan",
                f"- [ ] {body}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return path


def _blocking_paths(root: Path) -> list[str]:
    payload = lint_payload(root, require_status=True)
    return [
        issue["path"]
        for issue in payload["issues"]
        if issue.get("severity") != "warning" and "without updating indicators" in issue["message"]
    ]


# --- item_614: a same-day re-baseline clears the gate -------------------------


def test_a_second_touch_on_the_same_day_still_moves_the_reviewed_line(tmp_path: Path) -> None:
    """Day precision wrote back the value already there, leaving the gate nothing to see."""
    root = _git_repo(tmp_path)
    path = _write_task(root, "task_001_probe", "first")

    update_workflow_indicators_payload(root, "task_001_probe", {}, touch=True)
    first = path.read_text(encoding="utf-8")

    path.write_text(first.replace("- [ ] first", "- [ ] second"), encoding="utf-8")
    update_workflow_indicators_payload(root, "task_001_probe", {}, touch=True)
    second = path.read_text(encoding="utf-8")

    def reviewed(text: str) -> str:
        return next(line for line in text.splitlines() if line.startswith("> Indicators reviewed:"))

    assert reviewed(first) != reviewed(second)


def test_a_second_reviewed_edit_on_the_same_day_clears_the_indicator_gate(tmp_path: Path) -> None:
    root = _git_repo(tmp_path)
    path = _write_task(root, "task_001_probe", "first")
    _git(["add", "-A"], root)
    _git(["commit", "-q", "-m", "seed"], root)

    previous = "first"
    for body in ("second", "third"):
        path.write_text(
            path.read_text(encoding="utf-8").replace(f"- [ ] {previous}", f"- [ ] {body}"),
            encoding="utf-8",
        )
        previous = body
        update_workflow_indicators_payload(root, "task_001_probe", {}, touch=True)
        assert _blocking_paths(root) == [], f"gate still blocking after the {body} edit"
        _git(["add", "-A"], root)
        _git(["commit", "-q", "-m", body], root)


def test_an_edit_with_no_re_baseline_is_still_blocked(tmp_path: Path) -> None:
    root = _git_repo(tmp_path)
    path = _write_task(root, "task_001_probe", "first")
    _git(["add", "-A"], root)
    _git(["commit", "-q", "-m", "seed"], root)

    path.write_text(
        path.read_text(encoding="utf-8").replace("- [ ] first", "- [ ] second"),
        encoding="utf-8",
    )

    assert _blocking_paths(root) == ["logics/tasks/task_001_probe.md"]


# --- item_613: a closed task is reported as closed ---------------------------


def _unrelated_audit_blocker(root: Path) -> None:
    """A delivered request in another corpus with no implementation chain."""
    directory = root / "logics" / "request"
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "req_900_unrelated.md").write_text(
        "\n".join(
            [
                "## req_900_unrelated - Unrelated",
                "> From version: 2.20.0",
                "> Schema version: 1.0",
                "> Status: Done",
                "> Understanding: 100%",
                "> Confidence: 100%",
                "> Complexity: Low",
                "> Theme: Unrelated",
                "> Reminder: Update.",
                "",
                "# Needs",
                "- Something delivered elsewhere.",
                "",
                "# Acceptance criteria",
                "- AC1: Delivered.",
                "",
            ]
        ),
        encoding="utf-8",
    )


def _delivered_chain(root: Path, monkeypatch) -> None:
    for rel in ("request", "backlog", "tasks", "product"):
        (root / "logics" / rel).mkdir(parents=True, exist_ok=True)
    (root / "logics" / "product" / "prod_001_demo_product.md").write_text(
        "\n".join(
            [
                "## prod_001_demo_product - Demo Product",
                "> Date: 2026-06-07",
                "> Status: Proposed",
                "> Related request: (none yet)",
                "> Related backlog: (none yet)",
                "> Related task: (none yet)",
                "> Related architecture: (none yet)",
                "> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.",
                "# Overview Diagram",
                "```mermaid",
                "flowchart TD",
                "  Request[Demo need] --> Product[Demo Product]",
                "```",
                "# Overview",
                "- Demo product brief.",
                "# References",
                "- Product back-reference: (none yet)",
                "- Task back-reference: (none yet)",
                "",
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: root)
    assert main(["flow", "deliver", "--from-product", "prod_001_demo_product"]) == 0


def test_a_closeout_blocked_only_by_an_unrelated_audit_finding_reports_the_task_closed(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    root = tmp_path / "logics-repo"
    _delivered_chain(root, monkeypatch)
    _unrelated_audit_blocker(root)

    payload = closeout_payload(
        root,
        "task_001_demo_product",
        validations=[],
        validation_command="python -m pytest tests/python -q",
        validation_result="passed",
        run_index=False,
        run_lint=False,
        run_audit=True,
        dry_run=False,
    )

    assert payload["audit"]["issue_count"] > 0, "the unrelated blocker did not reach the audit"
    assert payload["ok"] is False
    assert payload["closed"] is True
    assert payload["post_close_validation_failed"] is True
    task_text = (root / "logics" / "tasks" / "task_001_demo_product.md").read_text(encoding="utf-8")
    assert "> Status: Done" in task_text


def test_the_printed_outcome_of_such_a_closeout_does_not_read_as_a_failure_to_close(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    root = tmp_path / "logics-repo"
    _delivered_chain(root, monkeypatch)
    _unrelated_audit_blocker(root)
    capsys.readouterr()

    main(["flow", "closeout", "task_001_demo_product", "--audit", "--validation-command", "python -m pytest tests/python -q", "--validation-result", "passed"])
    printed = capsys.readouterr().out

    assert "Closeout: CLOSED (post-close validation failed)" in printed
    assert "Closeout: FAILED" not in printed


def test_a_closeout_rolled_back_by_preflight_reports_the_task_not_closed(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A real non-closure: preflight refuses, the writes are restored, nothing was closed."""
    root = tmp_path / "logics-repo"
    _delivered_chain(root, monkeypatch)

    payload = closeout_payload(
        root,
        "task_001_demo_product",
        validations=[],
        run_index=False,
        run_lint=False,
        run_audit=False,
        dry_run=False,
    )

    assert payload["ok"] is False
    assert payload["rolled_back"] is True
    assert payload["closed"] is False
    assert payload["post_close_validation_failed"] is False
    assert "> Status: Done" not in (root / "logics" / "tasks" / "task_001_demo_product.md").read_text(encoding="utf-8")


def test_a_dry_run_closeout_reports_the_task_not_closed(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    root = tmp_path / "logics-repo"
    _delivered_chain(root, monkeypatch)

    payload = closeout_payload(
        root,
        "task_001_demo_product",
        validations=[],
        validation_command="python -m pytest tests/python -q",
        validation_result="passed",
        run_index=False,
        run_lint=False,
        run_audit=False,
        dry_run=True,
    )

    assert payload["closed"] is False
    assert payload["post_close_validation_failed"] is False
    assert "> Status: Done" not in (root / "logics" / "tasks" / "task_001_demo_product.md").read_text(encoding="utf-8")
