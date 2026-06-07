from __future__ import annotations

from pathlib import Path


def write_ac_traceability_chain(repo_root: Path) -> dict[str, Path]:
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    request_path = repo_root / "logics" / "request" / "req_001_demo.md"
    backlog_path = repo_root / "logics" / "backlog" / "item_001_demo.md"
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"

    request_path.write_text(
        "\n".join(
            [
                "## req_001_demo - Demo Request",
                "> Status: Ready",
                "# Acceptance criteria",
                "- AC1: Deliver demo.",
                "# Backlog",
                "- `item_001_demo`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    backlog_path.write_text(
        "\n".join(
            [
                "## item_001_demo - Demo Backlog",
                "> Status: Ready",
                "# Links",
                "- Request: `req_001_demo`",
                "- Primary task(s): `task_001_demo`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    task_path.write_text(
        "\n".join(
            [
                "## task_001_demo - Demo Task",
                "> Status: Ready",
                "# Plan",
                "- [x] Do the work.",
                "# Backlog",
                "- `item_001_demo`",
                "# Definition of Done (DoD)",
                "- [x] Validation passes.",
                "# Validation",
                "- command: `pytest python_tests -q` | result: passed | date: 2026-06-07",
                "# Links",
                "- Request: `req_001_demo`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    return {
        "request": request_path,
        "backlog": backlog_path,
        "task": task_path,
    }
