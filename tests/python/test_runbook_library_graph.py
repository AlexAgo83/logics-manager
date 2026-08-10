"""req_330/item_689: the runbook library graph is a separate contract from
`resolve_request_chain` -- category-to-runbook-to-linked-document, not one
request's delivery chain. A standalone runbook (no Related request/backlog/
task) must still appear in its category and open from the graph.
"""

from __future__ import annotations

from pathlib import Path

from logics_manager.chain_graph import resolve_runbook_library_graph


def _write(root: Path, rel: str, lines: list[str]) -> None:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def test_empty_library_returns_empty_graph(tmp_path: Path) -> None:
    payload = resolve_runbook_library_graph(tmp_path)
    assert payload == {"nodes": [], "edges": [], "dangling": []}


def test_standalone_runbook_appears_in_its_category_with_no_linked_doc(tmp_path: Path) -> None:
    _write(
        tmp_path,
        "logics/runbook/run_001_probe.md",
        [
            "## run_001_probe - Probe",
            "> Status: Active",
            "> Category: security",
            "> Verified: 2026-08-11, verified",
            "> Related request: (none yet)",
            "> Related backlog: (none yet)",
            "> Related task: (none yet)",
        ],
    )

    payload = resolve_runbook_library_graph(tmp_path)
    node_refs = {node["ref"] for node in payload["nodes"]}
    assert node_refs == {"category_security", "run_001_probe"}
    assert payload["edges"] == [{"from": "category_security", "to": "run_001_probe"}]
    assert payload["dangling"] == []


def test_runbook_with_a_linked_request_gets_an_extra_edge(tmp_path: Path) -> None:
    _write(
        tmp_path,
        "logics/runbook/run_001_probe.md",
        [
            "## run_001_probe - Probe",
            "> Status: Active",
            "> Category: release",
            "> Verified: 2026-08-11, verified",
            "> Related request: `req_001_probe`",
            "> Related backlog: (none yet)",
            "> Related task: (none yet)",
        ],
    )
    _write(tmp_path, "logics/request/req_001_probe.md", ["## req_001_probe - Probe request", "> Status: Ready"])

    payload = resolve_runbook_library_graph(tmp_path)
    edges = {(edge["from"], edge["to"]) for edge in payload["edges"]}
    assert ("category_release", "run_001_probe") in edges
    assert ("run_001_probe", "req_001_probe") in edges
    node_kinds = {node["ref"]: node["kind"] for node in payload["nodes"]}
    assert node_kinds["req_001_probe"] == "request"


def test_a_linked_ref_with_no_doc_on_disk_is_reported_dangling_not_raised(tmp_path: Path) -> None:
    _write(
        tmp_path,
        "logics/runbook/run_001_probe.md",
        [
            "## run_001_probe - Probe",
            "> Status: Active",
            "> Category: release",
            "> Verified: 2026-08-11, verified",
            "> Related request: `req_999_missing`",
            "> Related backlog: (none yet)",
            "> Related task: (none yet)",
        ],
    )

    payload = resolve_runbook_library_graph(tmp_path)
    assert "req_999_missing" in payload["dangling"]
    assert not any(edge["to"] == "req_999_missing" for edge in payload["edges"])


def test_runbooks_without_a_category_group_under_other(tmp_path: Path) -> None:
    _write(
        tmp_path,
        "logics/runbook/run_001_probe.md",
        ["## run_001_probe - Probe", "> Status: Draft"],
    )

    payload = resolve_runbook_library_graph(tmp_path)
    node_refs = {node["ref"] for node in payload["nodes"]}
    assert "category_other" in node_refs
