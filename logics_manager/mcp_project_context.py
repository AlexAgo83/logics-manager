from __future__ import annotations

import re
import subprocess
from pathlib import Path
from typing import Any

from .config import holds_corpus
from .flow import flow_list_payload
from .insights import COMPANION_KINDS, collect_logics_docs, status_payload
from .sync import read_logics_doc_payload, search_logics_docs_payload
from .viewer_docs import viewer_url_for_ref, viewer_url_template
from .viewer_git import _run_read_only_git, git_status_payload


FOLLOW_UP_TOOLS = (
    {"name": "search_project_context", "description": "Search bounded Logics docs for a specific topic."},
    {"name": "read_project_resource", "description": "Read one source pointer returned by onboarding or search."},
    {"name": "list_projects", "description": "List other known Logics projects that can be targeted."},
)


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


#: One discovery bound for both listing and resolving. They used to diverge -- listing
#: accepted a limit of 100 while resolving discovered 40 -- so `list_projects` handed out
#: ids that `onboard_project` then rejected as unknown.
PROJECT_DISCOVERY_LIMIT = 200


def _discovered_projects(root: Path) -> list[Path]:
    from .viewer import discover_viewer_project_roots

    return discover_viewer_project_roots(root, max_projects=PROJECT_DISCOVERY_LIMIT)


def project_entries(root: Path, *, limit: int = 40) -> list[dict[str, Any]]:
    # Filter first, truncate second: truncating the raw discovery dropped corpora behind
    # sibling directories that only looked like projects.
    corpora = [project for project in _discovered_projects(root) if holds_corpus(project)]
    return [public_project_entry(project, active_root=root) for project in corpora[:limit]]


def resolve_project_root(root: Path, project: str | None) -> Path:
    target = (project or "").strip()
    if not target:
        return root
    from .viewer import _viewer_project_id

    # Resolve against every discovered project, not only the ones holding a corpus: a
    # known project without one is answered with `corpus_present: false`, which is what
    # that field is for, rather than with `unknown_project`.
    roots = _discovered_projects(root)
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
    if len(candidates) == 1:
        return Path(by_id[candidates[0]["id"]]).resolve()
    raise ProjectContextError(
        "unknown_project" if not candidates else "ambiguous_project",
        "Unknown project target." if not candidates else "Project target is ambiguous.",
        details={"project": target, "candidates": candidates},
    )


def source_for_doc(item: dict[str, Any]) -> dict[str, str]:
    ref = str(item.get("ref") or "")
    # `source_id` is what `read_project_resource` takes back. Without it a caller had to
    # know to prefix the value itself, and a bare commit hash was rejected outright.
    return {"type": "logics_doc", "ref": ref, "path": str(item.get("path") or ""), "source_id": f"logics:{ref}"}


def source_for_commit(commit_hash: str) -> dict[str, str]:
    return {"type": "git_commit", "hash": commit_hash, "source_id": f"git:{commit_hash}"}


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
            "source": source_for_doc({"ref": doc.ref, "path": doc.rel_path}),
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
            "source": source_for_commit(str(commit.get("hash") or "")),
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


def onboard_project_payload(
    root: Path,
    *,
    project: str | None = None,
    include_recent_activity: bool = True,
    limit: int = 10,
    project_limit: int = 40,
) -> tuple[Path, dict[str, Any]]:
    """Returns the resolved project root alongside its payload.

    `limit` bounds the document lists only. It used to bound sibling-project discovery as
    well, so asking for a short document list silently hid most of the known projects.
    """
    target = resolve_project_root(root, project)
    if not holds_corpus(target):
        # Reachable now that a known project resolves whether or not it holds a corpus.
        # This is what `corpus_present` was always meant to report.
        return target, _with_viewer_url_template(target, {
            "ok": True,
            "available": True,
            "project_selected": True,
            "corpus_present": False,
            "degraded": [{"component": "logics", "state": "missing", "message": "This project has no Logics corpus."}],
            "messages": ["This project has no Logics corpus. Target another project or run `logics-manager init` there."],
            "project": {**public_project_entry(target, active_root=root), "rootName": target.name},
            "active_project": public_project_entry(root, active_root=root),
            "projects": project_entries(root, limit=project_limit),
            "active_work": [],
            "key_docs": [],
            "sources": [],
            "follow_up_tools": FOLLOW_UP_TOOLS,
        })
    active = flow_list_payload(target, kind="all")["entries"]
    companion_items = _companion_docs(target, limit=limit)
    payload: dict[str, Any] = {
        "ok": True,
        "available": True,
        "project_selected": True,
        "corpus_present": True,
        "degraded": [],
        "messages": [],
        "project": {**public_project_entry(target, active_root=root), "rootName": target.name},
        "active_project": public_project_entry(root, active_root=root),
        "projects": project_entries(root, limit=project_limit),
        "status": status_payload(target, limit=limit),
        "active_work": _with_doc_sources(active[:limit]),
        "key_docs": _with_doc_sources(companion_items[:limit]),
        "sources": [
            {"type": "status", "section": "status"},
            *[source_for_doc(item) for item in active[:limit]],
            *[source_for_doc(item) for item in companion_items[:limit]],
        ],
        "follow_up_tools": FOLLOW_UP_TOOLS,
    }
    if include_recent_activity:
        payload["recent_activity"] = _recent_activity(target, limit=limit)
        git_state = payload["recent_activity"]["git"].get("state")
        if git_state != "ok":
            payload["degraded"].append({"component": "git", "state": git_state, "message": payload["recent_activity"]["git"].get("message", "")})
    return target, payload


def search_project_context_payload(root: Path, *, query: str, project: str | None, kind: str, limit: int, max_snippet_chars: int) -> tuple[Path, dict[str, Any]]:
    target = resolve_project_root(root, project)
    payload = search_logics_docs_payload(target, query, kind=kind, limit=limit, max_snippet_chars=max_snippet_chars)
    return target, {**payload, "matches": [{**item, "source": source_for_doc(item)} for item in payload.get("matches", [])]}


def read_project_resource_payload(root: Path, *, source: str, project: str | None, max_chars: int) -> tuple[Path, dict[str, Any]]:
    target = resolve_project_root(root, project)
    kind, value = _normalize_project_resource(source)
    if kind == "logics":
        payload = read_logics_doc_payload(target, value, max_chars=max_chars, sections=None)
        return target, {**payload, "resource_type": "logics_doc", "source": source_for_doc(payload)}
    if kind == "git":
        if not re.fullmatch(r"[A-Fa-f0-9]{4,40}", value):
            raise ProjectContextError("invalid_reference", "Git commit resources must be short or full hex hashes.", details={"source": source})
        # Through `_run_read_only_git` for the two guards every other git call here has:
        # a scaled timeout, and a closed stdin so a credential or GPG prompt cannot park
        # the MCP server on a terminal nobody is watching.
        try:
            result = _run_read_only_git(target, ["show", "--no-ext-diff", "--stat", "--format=medium", value])
        except subprocess.TimeoutExpired:
            raise ProjectContextError("command_timeout", "Git command timed out.", details={"source": source}) from None
        except (OSError, subprocess.SubprocessError) as exc:
            raise ProjectContextError("command_failed", "Git command failed.", details={"source": source, "reason": type(exc).__name__}) from None
        if result.returncode != 0:
            raise ProjectContextError("command_failed", "Git command failed.", details={"stderr_tail": _scrub_absolute_paths(result.stderr[-2000:]), "returncode": result.returncode})
        return target, {"resource_type": "git_commit", "source": source_for_commit(value), "content": result.stdout[:max_chars], "truncated": len(result.stdout) > max_chars}
    raise ProjectContextError("unsupported_resource", "Unsupported project resource source.", details={"source": source, "supported": ["logics:<ref-or-path>", "git:<hex-commit>"]})


def tool_onboard_project(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    try:
        target, payload = onboard_project_payload(
            root,
            project=str(args.get("project") or "") or None,
            include_recent_activity=bool(args.get("include_recent_activity", True)),
            limit=_bounded_int(args.get("limit"), default=10, maximum=50),
            project_limit=_bounded_int(args.get("project_limit"), default=40, maximum=100),
        )
    except SystemExit as exc:
        raise ProjectContextError("invalid_reference", str(exc)) from exc
    # The template belongs to the project the payload describes; using the active root
    # pointed every {ref} link at a viewer that does not host those documents.
    return _with_viewer_url_template(target, payload)


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
        return _with_viewer_url(target, str(payload["ref"]), {**payload, "ok": True, "resource_type": "logics_doc", "source": source_for_doc(payload)})
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
    # A commit source used to advertise a bare hash and then be refused as unsupported,
    # so following the returned pointer literally failed on every commit.
    if re.fullmatch(r"[A-Fa-f0-9]{7,40}", raw):
        return "git", raw
    return "unsupported", raw


#: Absolute paths only -- a leading separator is required, so repo-relative paths such as
#: `logics/product/prod_001.md` are left alone.
_ABSOLUTE_PATH = re.compile(r"(?<![\w.\-])(?:[A-Za-z]:)?[\\/](?:[^\s'\"\\/]+[\\/])+[^\s'\"]*")


def _scrub_absolute_paths(text: str) -> str:
    """Git writes local paths into its own error text; the model never sees them."""
    return _ABSOLUTE_PATH.sub("<path>", text)


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
    """The most recently touched companion docs, with every kind represented.

    This used to append product, roadmap, architecture, and runbook in that order and
    truncate the concatenation, so on a repo with a hundred product briefs the caller got
    ten briefs -- the ten oldest, since the order was by filename -- and never an ADR.
    """
    by_kind: dict[str, list[dict[str, Any]]] = {kind: [] for kind in COMPANION_KINDS}
    for doc in collect_logics_docs(root, kinds=COMPANION_KINDS):
        entry = {"kind": doc.kind, "ref": doc.ref, "path": doc.rel_path, "title": doc.title, "status": doc.status}
        by_kind.setdefault(doc.kind, []).append({**entry, "_mtime": _mtime(doc.path)})
    for entries in by_kind.values():
        entries.sort(key=lambda entry: entry["_mtime"], reverse=True)
    share = max(1, limit // max(1, len([kind for kind, entries in by_kind.items() if entries])))
    picked: list[dict[str, Any]] = []
    for entries in by_kind.values():
        picked.extend(entries[:share])
    # A kind with fewer docs than its share leaves room; fill it from what is left over,
    # newest first, so a small limit still returns `limit` documents.
    if len(picked) < limit:
        chosen = {entry["ref"] for entry in picked}
        rest = [entry for entries in by_kind.values() for entry in entries if entry["ref"] not in chosen]
        rest.sort(key=lambda entry: entry["_mtime"], reverse=True)
        picked.extend(rest[: limit - len(picked)])
    picked.sort(key=lambda entry: entry["_mtime"], reverse=True)
    return [{key: value for key, value in entry.items() if key != "_mtime"} for entry in picked[:limit]]


def _mtime(path: Path) -> int:
    try:
        return path.stat().st_mtime_ns
    except OSError:
        return 0
