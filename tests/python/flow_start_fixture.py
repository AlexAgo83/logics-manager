"""Minimal task-with-linked-backlog fixture for the req_300 regression tests."""

from __future__ import annotations

from pathlib import Path


TASK_REF = "task_001_probe"
ITEM_REFS = ("item_001_slice_a", "item_002_slice_b")


def write_task_with_linked_items(repo_root: Path) -> tuple[str, tuple[str, ...]]:
    """Write a Ready task linked to two Ready backlog items and return their refs."""
    for item_ref in ITEM_REFS:
        (repo_root / "logics" / "backlog" / f"{item_ref}.md").write_text(
            "\n".join(
                [
                    f"## {item_ref} - Slice",
                    "> From version: 1.0.0",
                    "> Schema version: 1.0",
                    "> Status: Ready",
                    "> Understanding: 50%",
                    "> Confidence: 50%",
                    "> Progress: 0%",
                    "",
                    "# Links",
                    f"- Primary task(s): `{TASK_REF}`",
                    "",
                ]
            ),
            encoding="utf-8",
        )

    (repo_root / "logics" / "tasks" / f"{TASK_REF}.md").write_text(
        "\n".join(
            [
                f"## {TASK_REF} - Probe",
                "> From version: 1.0.0",
                "> Schema version: 1.0",
                "> Status: Ready",
                "> Understanding: 50%",
                "> Confidence: 50%",
                "> Progress: 0%",
                "",
                "# Links",
                *[f"- Backlog: `{item_ref}`" for item_ref in ITEM_REFS],
                "",
            ]
        ),
        encoding="utf-8",
    )
    return TASK_REF, ITEM_REFS
