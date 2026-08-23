from __future__ import annotations

import re
import subprocess
from pathlib import Path
from typing import Any

from .config import holds_corpus
from .flow import flow_list_payload
from .insights import collect_logics_docs, status_payload
from .sync import read_logics_doc_payload, search_logics_docs_payload
from .viewer_docs import viewer_url_for_ref, viewer_url_template
from .viewer_git import git_status_payload


class ProjectContextError(Exception):
    def __init__(self, code: str, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


def public_project_entry(root: Path, *, active_root: Path) -> dict[str, Any]:
    from .viewer import _viewer_project_id

    resolved = root.resolve()
    project_id = _viewer_project_id(resolved)
    return {
        "id": project_id,
        "name": resolved.name,
        "active": resolved == active_root.resolve(),
        "available": resolved.is_dir(),
        "hasLogics": holds_corpus(resolved),
        "source": {"type": "project", "id": project_id, "name": resolved.name},
    }


def project_entries(root: Path, *, limit: int = 40) -> list[dict[str, Any]]:
    from .viewer import discover_viewer_project_roots

    return [
        public_project_entry(project, active_root=root)
        for project in discover_viewer_project_roots(root, max_projects=limit)
        if holds_corpus(project)
    ]


def resolve_project_root(root: Path, project: str | None) -> Path:
    target = (project or "").strip()
    if not target:
        return root
    from .viewer import _viewer_project_id, discover_viewer_project_roots

    roots = [candidate for candidate in discover_viewer_project_roots(root) if holds_corpus(candidate)]
    by_id = {_viewer_project_id(candidate): candidate for candidate in roots}
    if target in by_id:
        return by_id[target].resolve()
    name_matches = [candidate for candidate in roots if candidate.name == target]
    if len(name_matches) == 1:
        return name_matches[0].resolve()
    candidates = [
        {"id": _viewer_project_id(candidate), "name": candidate.name}
        for candidate in roots
        if candidate.name == target or target.lower() in candidate.name.lower()
    ]
    raise ProjectContextError(
        "unknown_project" if not candidates else "ambiguous_project",
        "Unknown project target." if not candidates else "Project target is ambiguous.",
        details={"project": target, "candidates": candidates},
    )


def source_for_doc(item: dict[str, Any]) -> dict[str, str]:
    return {"type": "logics_doc", "ref": str(item.get("ref") or ""), "path": str(item.get("path") or "")}


def _with_doc_sources(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{**item, "source": source_for_doc(item)} for item in items]


def _recent_logics_activity(root: Path, *, limit: int) -> list[dict[str, Any]]:
    docs = sorted(
        collect_logics_docs(root),
        key=lambda doc: doc.path.stat().st_mtime_ns if doc.path.exists() else 0,
        reverse=True,
    )
    return [
        {
            "kind": doc.kind,
            "ref": doc.ref,
            "title": doc.title,
            "status": doc.status,
            "path": doc.rel_path,
            "source": {"type": "logics_doc", "ref": doc.ref, "path": doc.rel_path},
        }
        for doc in docs[:limit]
    ]


def _recent_activity(root: Path, *, limit: int) -> dict[str, Any]:
    git = git_status_payload(root)
    commits = [
        {
            "hash": str(commit.get("hash") or ""),
            "subject": str(commit.get("subject") or ""),
            "date": str(commit.get("date") or ""),
            "source": {"type": "git_commit", "hash": str(commit.get("hash") or "")},
        }
        for commit in (git.get("recentCommits") if isinstance(git.get("recentCommits"), list) else [])[:limit]
    ]
    return {
        "git": {
            "state": git.get("state"),
            "message": git.get("message", ""),
            "branch": git.get("branch", ""),
            "clean": git.get("clean"),
            "dirty": git.get("dirty"),
            "counts": git.get("counts", {}),
            "badgeCounts": git.get("badgeCounts", {}),
            "latestCommit": git.get("latestCommit", ""),
            "recentCommits": commits,
        },
        "logics": _recent_logics_activity(root, limit=limit),
    }


def onboard_project_payload(root: Path, *, project: str | None = None, include_recent_activity: bool = True, limit: int = 10) -> dict[str, Any]:
    target = resolve_project_root(root, project)
    active = flow_list_payload(target, kind="all")["entries"]
    companion_items = _companion_docs(target, limit=limit)
    payload: dict[str, Any] = {
        "ok": True,
        "available": True,
        "project_selected": True,
        "corpus_present": holds_corpus(target),
        "degraded": [],
        "messages": [],
        "project": {**public_project_entry(target, active_root=root), "rootName": target.name},
        "active_project": public_project_entry(root, active_root=root),
        "projects": project_entries(root, limit=limit),
        "status": status_payload(target, limit=limit),
        "active_work": _with_doc_sources(active[:limit]),
        "key_docs": _with_doc_sources(companion_items[:limit]),
        "sources": [
            {"type": "status", "section": "status"},
            *[source_for_doc(item) for item in active[:limit]],
            *[source_for_doc(item) for item in companion_items[:limit]],
        ],
        "follow_up_tools": [
            {"name": "search_project_context", "description": "Search bounded Logics docs for a specific topic."},
            {"name": "read_project_resource", "description": "Read one source pointer returned by onboarding or search."},
            {"name": "list_projects", "description": "List other known Logics projects that can be targeted."},
        ],
    }
    if include_recent_activity:
        payload["recent_activity"] = _recent_activity(target, limit=limit)
        git_state = payload["recent_activity"]["git"].get("state")
        if git_state != "ok":
            payload["degraded"].append({"component": "git", "state": git_state, "message": payload["recent_activity"]["git"].get("message", "")})
    return payload


def search_project_context_payload(root: Path, *, query: str, project: str | None, kind: str, limit: int, max_snippet_chars: int) -> tuple[Path, dict[str, Any]]:
    target = resolve_project_root(root, project)
    payload = search_logics_docs_payload(target, query, kind=kind, limit=limit, max_snippet_chars=max_snippet_chars)
    return target, {**payload, "matches": [{**item, "source": source_for_doc(item)} for item in payload.get("matches", [])]}


def read_project_resource_payload(root: Path, *, source: str, project: str | None, max_chars: int) -> tuple[Path, dict[str, Any]]:
    target = resolve_project_root(root, project)
    kind, value = _normalize_project_resource(source)
    if kind == "logics":
        payload = read_logics_doc_payload(target, value, max_chars=max_chars, sections=None)
        return target, {"resource_type": "logics_doc", "source": source_for_doc(payload), **payload}
    if kind == "git":
        if not re.fullmatch(r"[A-Fa-f0-9]{4,40}", value):
            raise ProjectContextError("invalid_reference", "Git commit resources must be short or full hex hashes.", details={"source": source})
        result = subprocess.run(["git", "show", "--no-ext-diff", "--stat", "--format=medium", value], cwd=target, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            raise ProjectContextError("command_failed", "Git command failed.", details={"stderr_tail": result.stderr[-2000:], "returncode": result.returncode})
        return target, {"resource_type": "git_commit", "source": {"type": "git_commit", "hash": value}, "content": result.stdout[:max_chars], "truncated": len(result.stdout) > max_chars}
    raise ProjectContextError("unsupported_resource", "Unsupported project resource source.", details={"source": source, "supported": ["logics:<ref-or-path>", "git:<hex-commit>"]})


def tool_onboard_project(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    try:
        payload = onboard_project_payload(
            root,
            project=str(args.get("project") or "") or None,
            include_recent_activity=bool(args.get("include_recent_activity", True)),
            limit=_bounded_int(args.get("limit"), default=10, maximum=50),
        )
    except SystemExit as exc:
        raise ProjectContextError("invalid_reference", str(exc)) from exc
    return _with_viewer_url_template(root, payload)


def tool_list_projects(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    limit = _bounded_int(args.get("limit"), default=40, maximum=100)
    projects = project_entries(root, limit=limit)
    return {"ok": True, "active_project": public_project_entry(root, active_root=root), "count": len(projects), "projects": projects}


def tool_get_active_project(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    return {"ok": True, "project": public_project_entry(root, active_root=root)}


def tool_search_project_context(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    try:
        target, payload = search_project_context_payload(
            root,
            query=str(args.get("query") or ""),
            project=str(args.get("project") or "") or None,
            kind=str(args.get("kind") or "all"),
            limit=_bounded_int(args.get("limit"), default=20, maximum=100),
            max_snippet_chars=_bounded_int(args.get("max_snippet_chars"), default=240, maximum=1000),
        )
    except SystemExit as exc:
        raise ProjectContextError("invalid_reference", str(exc)) from exc
    return _with_viewer_url_template(target, {"ok": True, **payload})


def tool_read_project_resource(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    try:
        target, payload = read_project_resource_payload(
            root,
            source=str(args.get("source") or ""),
            project=str(args.get("project") or "") or None,
            max_chars=_bounded_int(args.get("max_chars"), default=4000, maximum=12000),
        )
    except SystemExit as exc:
        raise ProjectContextError("invalid_reference", str(exc)) from exc
    if payload.get("resource_type") == "logics_doc":
        return _with_viewer_url(target, str(payload["ref"]), {"ok": True, "resource_type": "logics_doc", "source": source_for_doc(payload), **payload})
    return {"ok": True, **payload}


def _normalize_project_resource(source: str) -> tuple[str, str]:
    raw = source.strip()
    if raw.startswith("logics:"):
        return "logics", raw.removeprefix("logics:").strip()
    if raw.startswith("git:"):
        return "git", raw.removeprefix("git:").strip()
    if raw.startswith("git_commit:"):
        return "git", raw.removeprefix("git_commit:").strip()
    if raw.startswith("logics/") or re.match(r"^(req|item|task|prod|road|adr|spec|run)_", raw):
        return "logics", raw
    return "unsupported", raw


def _bounded_int(value: Any, *, default: int, maximum: int) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
        return default
    return min(value, maximum)


def _with_viewer_url(root: Path, ref: str, payload: dict[str, Any]) -> dict[str, Any]:
    link = viewer_url_for_ref(root, ref)
    if link:
        payload["viewer_url"] = link
    return payload


def _with_viewer_url_template(root: Path, payload: dict[str, Any]) -> dict[str, Any]:
    template = viewer_url_template(root)
    if template:
        payload["viewer_url_template"] = template
    return payload


def _companion_docs(root: Path, *, limit: int) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for kind, directory, pattern in (
        ("product", Path("logics/product"), "prod_*.md"),
        ("roadmap", Path("logics/roadmap"), "road_*.md"),
        ("architecture", Path("logics/architecture"), "adr_*.md"),
        ("runbook", Path("logics/runbook"), "run_*.md"),
    ):
        for path in sorted((root / directory).glob(pattern)):
            if path.is_file() and not path.is_symlink():
                rel = path.relative_to(root).as_posix()
                items.append({"kind": kind, "ref": path.stem, "path": rel, "title": _title(path), "status": _status(path)})
    return items[:limit]


def _title(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            heading = line[3:].strip()
            return heading.split(" - ", 1)[-1]
    return path.stem


def _status(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("> Status:"):
            return line.split(":", 1)[1].strip()
    return "Unknown"
