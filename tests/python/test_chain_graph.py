"""req_320/item_660: the chain resolver must read only structural sections.

Reproduces the exact req_319/item_649 false-edge case: a ref mentioned only
in a request's prose (`# Context`) must never appear as a node or edge, even
though a full-text ref scan would find it.
"""

from __future__ import annotations

from pathlib import Path

from logics_manager.chain_graph import resolve_request_chain


def _write(root: Path, rel: str, lines: list[str]) -> None:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_repo(root: Path) -> None:
    _write(
        root,
        "logics/request/req_001_demo.md",
        [
            "## req_001_demo - Demo request",
            "> Status: Doing",
            "",
            "# Context",
            "- Mentioned only in prose, not a real link: item_999_prose_only.",
            "",
            "# Companion docs",
            "- `prod_001_demo`",
            "",
            "# Backlog",
            "- `item_001_slice`",
            "- `item_002_dangling_ref_only`",
            "",
        ],
    )
    _write(
        root,
        "logics/product/prod_001_demo.md",
        ["## prod_001_demo - Demo product", "> Status: Settled", ""],
    )
    _write(
        root,
        "logics/backlog/item_001_slice.md",
        [
            "## item_001_slice - Slice",
            "> Status: Ready",
            "",
            "# Links",
            "- Request: `req_001_demo`",
            "- Primary task(s): `task_001_do_the_slice`",
            "",
        ],
    )
    # item_002 is listed in req_001's Backlog section but never written to disk - dangling.
    _write(
        root,
        "logics/tasks/task_001_do_the_slice.md",
        [
            "## task_001_do_the_slice - Do the slice",
            "> Status: Doing",
            "",
            "# Backlog",
            "- `item_001_slice`",
            "",
            "# Links",
            "- Request: `req_001_demo`",
            "",
        ],
    )


def test_resolves_full_chain_from_the_request(tmp_path: Path) -> None:
    _write_repo(tmp_path)
    result = resolve_request_chain(tmp_path, "req_001_demo")
    node_refs = {node["ref"] for node in result["nodes"]}
    assert node_refs == {"req_001_demo", "prod_001_demo", "item_001_slice", "task_001_do_the_slice"}
    assert {"from": "req_001_demo", "to": "item_001_slice"} in result["edges"]
    assert {"from": "item_001_slice", "to": "task_001_do_the_slice"} in result["edges"]


def test_prose_only_ref_never_becomes_a_node_or_edge(tmp_path: Path) -> None:
    """The exact req_319/item_649 false-edge case."""
    _write_repo(tmp_path)
    result = resolve_request_chain(tmp_path, "req_001_demo")
    node_refs = {node["ref"] for node in result["nodes"]}
    assert "item_999_prose_only" not in node_refs
    assert all(edge["to"] != "item_999_prose_only" for edge in result["edges"])


def test_dangling_structural_ref_is_reported_not_raised(tmp_path: Path) -> None:
    _write_repo(tmp_path)
    result = resolve_request_chain(tmp_path, "req_001_demo")
    assert "item_002_dangling_ref_only" in result["dangling"]
    node_refs = {node["ref"] for node in result["nodes"]}
    assert "item_002_dangling_ref_only" not in node_refs


def test_resolves_from_a_task_ref_by_walking_up_to_the_request(tmp_path: Path) -> None:
    _write_repo(tmp_path)
    result = resolve_request_chain(tmp_path, "task_001_do_the_slice")
    assert result["root"] == "req_001_demo"
    node_refs = {node["ref"] for node in result["nodes"]}
    assert node_refs == {"req_001_demo", "prod_001_demo", "item_001_slice", "task_001_do_the_slice"}


def test_resolves_from_a_backlog_item_ref_by_walking_up_to_the_request(tmp_path: Path) -> None:
    _write_repo(tmp_path)
    result = resolve_request_chain(tmp_path, "item_001_slice")
    assert result["root"] == "req_001_demo"


def test_request_with_no_backlog_yields_a_single_node_graph(tmp_path: Path) -> None:
    _write(
        root=tmp_path,
        rel="logics/request/req_002_lonely.md",
        lines=["## req_002_lonely - Lonely request", "> Status: Draft", ""],
    )
    result = resolve_request_chain(tmp_path, "req_002_lonely")
    assert [node["ref"] for node in result["nodes"]] == ["req_002_lonely"]
    assert result["edges"] == []


def test_unresolvable_ref_returns_empty_graph_with_a_dangling_note(tmp_path: Path) -> None:
    result = resolve_request_chain(tmp_path, "item_999_nowhere")
    assert result["nodes"] == []
    assert result["edges"] == []
    assert result["dangling"]
