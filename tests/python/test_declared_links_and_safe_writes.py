"""Lineage is what a doc declares, and a lifecycle write changes only what it means to.

Two families of regressions:

- A ref mentioned in prose (`unlike item_002_beta`) used to act as a link: `finish`
  closed the mentioned chain, `repair links`/`repair gates` rewrote and ticked it,
  and status/health stopped listing it as "Backlog without task".
- Indicator rewrites matched anywhere in the body, line splitting broke on U+2028
  and form feed, CRLF docs were rewritten to LF, and a doc that could not be read
  halfway through `finish` left the chain half-written.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from logics_manager.chain_graph import resolve_request_chain
from logics_manager.cli import main
from logics_manager.doc_parsing import declared_refs
from logics_manager.flow import closeout_payload, progress_task_payload, repair_gates_payload, repair_links_payload
from logics_manager.insights import health_payload, status_payload


def _write(path: Path, lines: list[str]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def _chain(repo_root: Path, *, task_extra: list[str] | None = None) -> dict[str, Path]:
    """Two independent chains; the alpha task only *mentions* the beta chain."""
    docs = {
        "req_alpha": _write(
            repo_root / "logics/request/req_001_alpha.md",
            ["## req_001_alpha - Alpha", "> Status: Ready", "# Definition of Ready (DoR)", "- [x] Scoped",
             "# Backlog", "- `item_001_alpha`"],
        ),
        "req_beta": _write(
            repo_root / "logics/request/req_002_beta.md",
            ["## req_002_beta - Beta", "> Status: Ready", "# Definition of Ready (DoR)", "- [ ] Scoped",
             "# Backlog", "- `item_002_beta`"],
        ),
        "item_alpha": _write(
            repo_root / "logics/backlog/item_001_alpha.md",
            ["## item_001_alpha - Alpha", "> Status: Ready", "> Progress: 0%", "# Links",
             "- Request: `req_001_alpha`", "- Primary task(s): `task_001_alpha`"],
        ),
        "item_beta": _write(
            repo_root / "logics/backlog/item_002_beta.md",
            ["## item_002_beta - Beta", "> Status: Ready", "> Progress: 0%", "# Links",
             "- Request: `req_002_beta`", "- Primary task(s): (none yet)"],
        ),
        "task_alpha": _write(
            repo_root / "logics/tasks/task_001_alpha.md",
            ["## task_001_alpha - Alpha", "> Status: In progress", "> Progress: 50%", "# Backlog",
             "- `item_001_alpha`", "# Definition of Done (DoD)", "- [x] Done", "# Notes",
             "- This works unlike `item_002_beta`, see `req_002_beta`.", *(task_extra or []),
             "# Links", "- Request: `req_001_alpha`"],
        ),
    }
    return docs


@pytest.fixture
def repo_root(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    root = tmp_path / "repo"
    (root / "logics").mkdir(parents=True)
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: root)
    return root


def test_finish_does_not_close_a_chain_the_task_only_mentions(repo_root: Path) -> None:
    docs = _chain(repo_root)
    beta_item, beta_request = docs["item_beta"].read_text(), docs["req_beta"].read_text()

    assert main(["flow", "finish", "task", str(docs["task_alpha"])]) == 0

    assert "> Status: Done" in docs["item_alpha"].read_text()
    assert "> Status: Done" in docs["req_alpha"].read_text()
    assert docs["item_beta"].read_text() == beta_item
    assert docs["req_beta"].read_text() == beta_request


def test_repair_links_and_gates_leave_a_mentioned_chain_alone(repo_root: Path) -> None:
    docs = _chain(repo_root)
    beta_item, beta_request = docs["item_beta"].read_text(), docs["req_beta"].read_text()

    repair_links_payload(repo_root, "task_001_alpha", dry_run=False)
    repair_gates_payload(repo_root, "task_001_alpha", dry_run=False)

    assert docs["item_beta"].read_text() == beta_item
    assert docs["req_beta"].read_text() == beta_request


def test_product_mentioned_in_prose_is_not_a_link(repo_root: Path) -> None:
    docs = _chain(repo_root, task_extra=["- Unlike `prod_002_beta`."])
    product = _write(repo_root / "logics/product/prod_002_beta.md", ["## prod_002_beta - Beta", "> Status: Accepted"])
    assert declared_refs("task", docs["task_alpha"].read_text(), "product") == []

    repair_links_payload(repo_root, "task_001_alpha", dry_run=False)

    assert "> Status: Accepted" in product.read_text()
    assert all(issue["code"] != "missing_product_target" for issue in closeout_payload(
        repo_root, "task_001_alpha", validations=[], run_index=False, run_lint=False, run_audit=False, dry_run=True
    )["preflight"]["issues"])


def test_finish_verification_failure_restores_chain(repo_root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    docs = _chain(repo_root)
    before = {path: path.read_bytes() for path in docs.values()}
    monkeypatch.setattr("logics_manager.flow._verify_finished_task_chain", lambda *_args: ["forced failure"])

    with pytest.raises(SystemExit, match="Finish verification failed"):
        main(["flow", "finish", "task", str(docs["task_alpha"])])

    assert {path: path.read_bytes() for path in docs.values()} == before


def test_closeout_finish_verification_failure_restores_chain(repo_root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    docs = _chain(repo_root)
    before = {path: path.read_bytes() for path in docs.values()}
    monkeypatch.setattr("logics_manager.flow.validate_closeout_payload", lambda *_args: {"issues": []})
    monkeypatch.setattr("logics_manager.flow._verify_finished_task_chain", lambda *_args: ["forced failure"])

    with pytest.raises(SystemExit, match="Finish verification failed"):
        closeout_payload(repo_root, "task_001_alpha", validations=[], run_index=False, run_lint=False,
                         run_audit=False, dry_run=False)

    assert {path: path.read_bytes() for path in docs.values()} == before


def test_status_and_health_still_list_a_mentioned_item_as_without_task(repo_root: Path) -> None:
    _chain(repo_root)
    status_refs = {doc["ref"] for doc in status_payload(repo_root)["backlog_without_task"]}
    health_refs = {doc["ref"] for doc in health_payload(repo_root)["issues"]["backlog_without_task"]}

    assert status_refs == health_refs == {"item_002_beta"}


def test_chain_graph_reads_tasks_declared_under_tasks_heading(repo_root: Path) -> None:
    docs = _chain(repo_root)
    docs["item_alpha"].write_text(
        "\n".join(["## item_001_alpha - Alpha", "> Status: Ready", "# Links", "- Request: `req_001_alpha`",
                   "# Tasks", "- `task_001_alpha`"]) + "\n",
        encoding="utf-8",
    )
    graph = resolve_request_chain(repo_root, "req_001_alpha")
    assert {"from": "item_001_alpha", "to": "task_001_alpha"} in graph["edges"]


def test_finish_leaves_a_fenced_status_example_alone(repo_root: Path) -> None:
    docs = _chain(repo_root, task_extra=["```md", "> Status: Draft", "```"])

    assert main(["flow", "finish", "task", str(docs["task_alpha"])]) == 0

    lines = docs["task_alpha"].read_text().split("\n")
    assert lines[1] == "> Status: Done"
    assert "> Status: Draft" in lines


def test_progress_is_inserted_in_the_header_not_under_a_body_quote(repo_root: Path) -> None:
    docs = _chain(repo_root)
    docs["task_alpha"].write_text(
        "\n".join(["## task_001_alpha - Alpha", "> Status: In progress", "# Backlog", "- `item_001_alpha`",
                   "# Notes", "> a quoted remark", "", "# Links", "- Request: `req_001_alpha`"]) + "\n",
        encoding="utf-8",
    )

    progress_task_payload(repo_root, "task_001_alpha", progress="40%", dry_run=False)

    lines = docs["task_alpha"].read_text().split("\n")
    assert lines[:3] == ["## task_001_alpha - Alpha", "> Status: In progress", "> Progress: 40%"]
    assert lines[lines.index("> a quoted remark") + 1] == ""


def test_progress_keeps_crlf_and_unicode_line_separators(repo_root: Path) -> None:
    docs = _chain(repo_root)
    original = docs["task_alpha"].read_text().replace("- Request:", "- Odd sep\x0cfeed\x85next\n- Request:")
    docs["task_alpha"].write_bytes(original.replace("\n", "\r\n").encode("utf-8"))

    progress_task_payload(repo_root, "task_001_alpha", progress="70%", dry_run=False)

    expected = original.replace("> Progress: 50%", "> Progress: 70%").replace("\n", "\r\n")
    assert docs["task_alpha"].read_bytes().decode("utf-8") == expected


def test_finish_writes_nothing_when_another_doc_cannot_be_read(repo_root: Path) -> None:
    docs = _chain(repo_root)
    (repo_root / "logics/tasks/task_009_latin.md").write_bytes("## task_009_latin - caf\xe9\n".encode("latin-1"))
    before = {path: path.read_bytes() for path in docs.values()}

    with pytest.raises((SystemExit, UnicodeDecodeError)) as raised:
        main(["flow", "finish", "task", str(docs["task_alpha"])])

    assert {path: path.read_bytes() for path in docs.values()} == before
    assert "task_009_latin" in str(raised.value)


def test_closeout_rollback_restores_a_doc_reached_only_through_links(repo_root: Path) -> None:
    docs = _chain(repo_root)
    # A second slice declares the task and the request, but the task does not declare
    # it back: AC repair writes it, yet it was never among the closeout's related paths.
    _write(docs["req_alpha"], ["## req_001_alpha - Alpha", "> Status: Ready", "# Acceptance criteria",
                               "- AC1: Deliver.", "# Definition of Ready (DoR)", "- [x] Scoped",
                               "# Backlog", "- `item_001_alpha`", "- `item_003_side`"])
    side = _write(repo_root / "logics/backlog/item_003_side.md",
                  ["## item_003_side - Side", "> Status: Ready", "# Links", "- Request: `req_001_alpha`",
                   "# Tasks", "- `task_001_alpha`"])
    before = side.read_bytes()

    payload = closeout_payload(repo_root, "task_001_alpha", validations=[], run_index=False, run_lint=False,
                               run_audit=False, dry_run=False)

    assert payload["rolled_back"] is True
    assert side.read_bytes() == before
