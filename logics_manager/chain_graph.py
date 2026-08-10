"""req_320/item_660: resolve one request's chain (request -> product brief ->
backlog items -> tasks) purely from each doc's own structural link sections,
not a full-text ref scan.

`logics-manager sync context-pack`'s `linked_refs` does a full-text scan over
doc bodies and can produce a false edge from a ref mentioned only as a prose
example - observed directly while scoping this request: `item_649`, cited in
req_319's own Context section purely to illustrate the ref-quoting format,
came back as a linked ref of req_319 even though the two are unrelated. This
resolver reads only each doc's declared `# Backlog`/`# Links`/`# Companion
docs` sections (via the existing `section_lines`/`extract_refs` primitives),
so a ref mentioned only in prose never produces a node or edge.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from pathlib import Path

from .doc_parsing import extract_refs, section_lines

_DOC_DIR_BY_PREFIX = {
    "req": "logics/request",
    "item": "logics/backlog",
    "task": "logics/tasks",
    "prod": "logics/product",
}
_KIND_BY_PREFIX = {"req": "request", "item": "backlog", "task": "task", "prod": "product"}


@dataclass(frozen=True)
class ChainNode:
    ref: str
    kind: str
    title: str
    status: str


def _resolve_path(repo_root: Path, ref: str) -> Path | None:
    prefix = ref.split("_", 1)[0]
    directory = _DOC_DIR_BY_PREFIX.get(prefix)
    if directory is None:
        return None
    path = repo_root / directory / f"{ref}.md"
    return path if path.is_file() else None


def _structural_refs(lines: list[str], heading: str, prefix: str) -> list[str]:
    """Refs of `prefix` found only under `# {heading}`, never elsewhere in the doc."""
    section_text = "\n".join(section_lines(lines, heading))
    return extract_refs(section_text, prefix)


def _title_and_status(lines: list[str]) -> tuple[str, str]:
    title = ""
    for line in lines:
        if line.startswith("## "):
            payload = line.removeprefix("## ").strip()
            title = payload.split(" - ", 1)[1].strip() if " - " in payload else payload
            break
    status = ""
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("> Status:"):
            status = stripped.split(":", 1)[1].strip()
            break
    return title, status


def _load_node(repo_root: Path, ref: str) -> tuple[ChainNode, list[str]] | None:
    path = _resolve_path(repo_root, ref)
    if path is None:
        return None
    prefix = ref.split("_", 1)[0]
    lines = path.read_text(encoding="utf-8").splitlines()
    title, status = _title_and_status(lines)
    return ChainNode(ref=ref, kind=_KIND_BY_PREFIX[prefix], title=title, status=status), lines


def _find_owning_request(repo_root: Path, ref: str, *, _seen: set[str] | None = None) -> str | None:
    prefix = ref.split("_", 1)[0]
    if prefix == "req":
        return ref
    seen = _seen or set()
    if ref in seen:
        return None
    seen.add(ref)
    loaded = _load_node(repo_root, ref)
    if loaded is None:
        return None
    _node, lines = loaded
    request_refs = _structural_refs(lines, "Links", "req")
    if request_refs:
        return request_refs[0]
    if prefix == "task":
        for item_ref in _structural_refs(lines, "Backlog", "item"):
            owning = _find_owning_request(repo_root, item_ref, _seen=seen)
            if owning:
                return owning
    return None


def resolve_request_chain(repo_root: Path, ref: str) -> dict[str, object]:
    """`ref` may be a request, backlog, or task ref - resolution always walks
    up to the owning request first, then rebuilds the chain downward from it.
    A ref in a structural section that doesn't resolve to a real doc is
    skipped and reported in `dangling`, never raised as an error."""
    request_ref = _find_owning_request(repo_root, ref)
    if request_ref is None:
        return {"root": ref, "nodes": [], "edges": [], "dangling": [f"could not resolve a request for {ref}"]}

    loaded = _load_node(repo_root, request_ref)
    if loaded is None:
        return {"root": ref, "nodes": [], "edges": [], "dangling": [f"request {request_ref} not found on disk"]}
    request_node, request_lines = loaded

    nodes: dict[str, ChainNode] = {request_ref: request_node}
    edges: list[tuple[str, str]] = []
    dangling: list[str] = []

    for prod_ref in _structural_refs(request_lines, "Companion docs", "prod"):
        result = _load_node(repo_root, prod_ref)
        if result is None:
            dangling.append(prod_ref)
            continue
        nodes[prod_ref] = result[0]
        edges.append((request_ref, prod_ref))

    for item_ref in _structural_refs(request_lines, "Backlog", "item"):
        result = _load_node(repo_root, item_ref)
        if result is None:
            dangling.append(item_ref)
            continue
        item_node, item_lines = result
        nodes[item_ref] = item_node
        edges.append((request_ref, item_ref))

        for task_ref in _structural_refs(item_lines, "Links", "task"):
            task_result = _load_node(repo_root, task_ref)
            if task_result is None:
                dangling.append(task_ref)
                continue
            nodes[task_ref] = task_result[0]
            edges.append((item_ref, task_ref))

    return {
        "root": request_ref,
        "nodes": [asdict(node) for node in nodes.values()],
        "edges": [{"from": source, "to": target} for source, target in edges],
        "dangling": dangling,
    }


def resolve_runbook_library_graph(repo_root: Path) -> dict[str, object]:
    """Category -> runbook -> optional linked Logics document (req_330/item_689).

    Independent of `resolve_request_chain`: this answers "what's in the
    runbook library", not "what chain does one request own", so it walks
    `logics/runbook/` directly instead of a request's structural sections. A
    runbook with no `Related request/backlog/task` still gets a node and a
    category edge -- a standalone runbook is a normal library entry.
    """
    directory = repo_root / "logics" / "runbook"
    nodes: dict[str, dict[str, object]] = {}
    edges: list[tuple[str, str]] = []
    dangling: list[str] = []
    if not directory.is_dir():
        return {"nodes": [], "edges": [], "dangling": dangling}

    for path in sorted(directory.glob("run_*.md")):
        lines = path.read_text(encoding="utf-8").splitlines()
        title, status = _title_and_status(lines)
        ref = path.stem

        category = ""
        related_lines: list[str] = []
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("> Category:"):
                category = stripped.split(":", 1)[1].strip()
            elif stripped.startswith(("> Related request:", "> Related backlog:", "> Related task:")):
                related_lines.append(stripped.split(":", 1)[1])
        category = category or "other"
        category_ref = "category_" + re.sub(r"[^a-z0-9]+", "_", category.lower()).strip("_")

        nodes.setdefault(category_ref, {"ref": category_ref, "kind": "category", "title": category.title(), "status": ""})
        nodes[ref] = {"ref": ref, "kind": "runbook", "title": title, "status": status}
        edges.append((category_ref, ref))

        related_blob = "\n".join(related_lines)
        for prefix in ("req", "item", "task"):
            for linked_ref in extract_refs(related_blob, prefix):
                result = _load_node(repo_root, linked_ref)
                if result is None:
                    dangling.append(linked_ref)
                    continue
                nodes.setdefault(linked_ref, asdict(result[0]))
                edges.append((ref, linked_ref))

    return {
        "nodes": list(nodes.values()),
        "edges": [{"from": source, "to": target} for source, target in edges],
        "dangling": dangling,
    }
