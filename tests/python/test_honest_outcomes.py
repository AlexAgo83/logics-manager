"""Regression tests for req_308, honest outcomes across audit, help, and closeout.

Each test pins a defect recorded in prod_056. The scenarios are the ones that were
reproduced by hand: an abandoned request asked to justify itself as delivered, a flag
the tool recommends but its help denies, a closeout that reports failure after closing,
and a re-baseline that cannot clear the finding it is recommended for.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

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
