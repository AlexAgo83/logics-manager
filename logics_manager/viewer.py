from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import subprocess
import sys
import webbrowser
from dataclasses import dataclass
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, quote, unquote, urlencode, urlparse

from .audit import audit_payload
from .config import find_repo_root
from .lint import lint_payload
from .update_check import get_update_info


@dataclass(frozen=True)
class ViewerDocFamily:
    stage: str
    directory: str
    prefixes: tuple[str, ...]


DOC_FAMILIES = (
    ViewerDocFamily("request", "logics/request", ("req_",)),
    ViewerDocFamily("backlog", "logics/backlog", ("item_",)),
    ViewerDocFamily("task", "logics/tasks", ("task_",)),
    ViewerDocFamily("product", "logics/product", ("prod_",)),
    ViewerDocFamily("architecture", "logics/architecture", ("adr_",)),
    ViewerDocFamily("spec", "logics/specs", ("spec_", "req_")),
)

STAGE_ORDER = {family.stage: index for index, family in enumerate(DOC_FAMILIES)}
REPO_ROOT = Path(__file__).resolve().parents[1]
PACKAGE_VIEWER_ASSETS_ROOT = Path(__file__).resolve().parent / "viewer_assets"
VIEWER_ROOT = REPO_ROOT / "clients" / "viewer"
if not (VIEWER_ROOT / "index.html").is_file():
    VIEWER_ROOT = PACKAGE_VIEWER_ASSETS_ROOT / "viewer"
SHARED_MEDIA_ROOT = REPO_ROOT / "clients" / "shared-web" / "media"
if not SHARED_MEDIA_ROOT.is_dir():
    SHARED_MEDIA_ROOT = PACKAGE_VIEWER_ASSETS_ROOT / "media"
DIST_VENDOR_ROOT = REPO_ROOT / "dist" / "vendor"
PACKAGE_VENDOR_ROOT = PACKAGE_VIEWER_ASSETS_ROOT / "vendor"
NODE_MERMAID_ROOT = REPO_ROOT / "node_modules" / "mermaid" / "dist"


def _current_version() -> str:
    try:
        return (REPO_ROOT / "VERSION").read_text(encoding="utf-8").strip() or "0.0.0"
    except OSError:
        return "0.0.0"


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _parse_title(lines: list[str], fallback: str) -> str:
    for line in lines:
        if not line.startswith("## "):
            continue
        raw = line[3:].strip()
        match = re.match(r"^\S+\s*-\s*(.+)$", raw)
        return (match.group(1) if match else raw).strip()
    return fallback


def _parse_indicators(lines: list[str]) -> dict[str, str]:
    indicators: dict[str, str] = {}
    for line in lines:
        if not line.startswith(">"):
            continue
        trimmed = re.sub(r"^>\s*", "", line).strip()
        if ":" not in trimmed:
            continue
        key, value = trimmed.split(":", 1)
        if key.strip() and value.strip():
            indicators[key.strip()] = value.strip()
    return indicators


def _extract_section_lines(content: str, section_title: str) -> list[str]:
    expected = f"# {section_title}".lower()
    collected: list[str] = []
    in_section = False
    for line in content.splitlines():
        if line.strip().lower() == expected:
            in_section = True
            continue
        if not in_section:
            continue
        if line.startswith("# "):
            break
        collected.append(line)
    return collected


def _summary_entries(content: str, section_title: str, limit: int) -> list[str]:
    entries: list[str] = []
    for raw_line in _extract_section_lines(content, section_title):
        line = raw_line.strip()
        if not line or line.startswith("```") or line.startswith("%%") or re.fullmatch(r"-+", line):
            continue
        bullet = re.match(r"^[-*]\s+(.*)$", line)
        value = bullet.group(1) if bullet else line
        if not value.startswith("#"):
            normalized = re.sub(r"\s+", " ", value.replace("> ", "")).strip()
            if normalized and normalized.lower() not in {entry.lower() for entry in entries}:
                entries.append(normalized)
        if len(entries) >= limit:
            break
    return entries


def _build_summary_points(content: str, fallback_title: str) -> list[str]:
    entries = [
        *_summary_entries(content, "Needs", 2),
        *_summary_entries(content, "Problem", 2),
        *_summary_entries(content, "Context", 2),
        *_summary_entries(content, "Scope", 2),
    ]
    deduped: list[str] = []
    for entry in entries:
        if entry.lower() not in {existing.lower() for existing in deduped}:
            deduped.append(entry)
    return deduped[:4] or [fallback_title]


def _collect_backticked_links(text: str) -> list[str]:
    return [match.group(1) for match in re.finditer(r"`([^`]+)`", text) if match.group(1)]


def _normalize_ref(value: str) -> str:
    normalized = value.replace("\\", "/").lstrip("./").strip()
    if "/" in normalized:
        return normalized
    bare_name = normalized[:-3] if normalized.endswith(".md") else normalized
    for family in DOC_FAMILIES:
        if bare_name.startswith(family.prefixes):
            return f"{family.directory}/{bare_name}.md"
    return normalized


def normalize_viewer_focus_target(repo_root: Path, value: str) -> str:
    raw = unquote(value).replace("\\", "/").strip()
    if not raw:
        raise ValueError("Focus target cannot be empty.")
    if raw.startswith("~") or raw.startswith(("/", "\\")) or re.match(r"^[A-Za-z]:", raw):
        raise ValueError("Focus target must be a workflow ref or repo-relative Logics path.")
    parts = [part for part in raw.split("/") if part]
    if any(part == ".." for part in parts):
        raise ValueError("Focus target cannot contain path traversal.")
    normalized = _normalize_ref(raw.lstrip("./")).lstrip("/")
    if "/" not in raw and normalized == raw:
        raise ValueError("Focus target must be a known workflow ref or repo-relative Logics path.")
    if "/" in normalized:
        absolute = (repo_root.resolve() / normalized).resolve()
        root = repo_root.resolve()
        if root != absolute and root not in absolute.parents:
            raise ValueError("Focus target escapes repository root.")
        allowed_prefixes = tuple(f"{family.directory}/" for family in DOC_FAMILIES)
        if not normalized.startswith(allowed_prefixes) or not normalized.endswith(".md"):
            raise ValueError("Focus target must point to a Logics Markdown document.")
    return normalized


def build_viewer_url(host: str, port: int, *, focus: str | None = None, read: bool = False) -> str:
    url = f"http://{host}:{port}"
    query: dict[str, str] = {}
    if focus:
        query["focus"] = focus
    if read:
        query["read"] = "1"
    if query:
        url = f"{url}?{urlencode(query, quote_via=quote)}"
    return url


def _section_links(content: str, section_title: str) -> list[str]:
    links: list[str] = []
    for line in _extract_section_lines(content, section_title):
        if "(none yet)" in line:
            continue
        links.extend(_collect_backticked_links(line))
    return sorted({_normalize_ref(link) for link in links})


def _indicator_links(lines: list[str], keys: set[str]) -> list[str]:
    links: list[str] = []
    for line in lines:
        if not line.startswith(">"):
            continue
        trimmed = re.sub(r"^>\s*", "", line).strip()
        if ":" not in trimmed:
            continue
        key, value = trimmed.split(":", 1)
        if key.strip().lower() in keys:
            links.extend(_collect_backticked_links(value))
    return sorted({_normalize_ref(link) for link in links})


def _extract_references(content: str, lines: list[str]) -> list[dict[str, str]]:
    references: list[dict[str, str]] = []
    for label, pattern in (
        ("Promoted from", re.compile(r"Promoted from `([^`]+)`", re.IGNORECASE)),
        ("Derived from", re.compile(r"Derived from(?: [a-z][a-z ]+)? `([^`]+)`", re.IGNORECASE)),
    ):
        for match in pattern.finditer(content):
            references.append({"kind": "from", "label": label, "path": _normalize_ref(match.group(1))})
    for link in _section_links(content, "Backlog"):
        references.append({"kind": "backlog", "label": "Backlog", "path": link})
    manual_links = {
        *_section_links(content, "References"),
        *_indicator_links(lines, {"related request", "related backlog", "related task", "related architecture"}),
    }
    for link in sorted(manual_links):
        references.append({"kind": "manual", "label": "Reference", "path": link})
    return references


def _infer_stage(rel_path: str, doc_id: str) -> str:
    normalized = rel_path.replace("\\", "/").lower()
    for family in DOC_FAMILIES:
        if normalized.startswith(f"{family.directory}/") or doc_id.startswith(family.prefixes):
            return family.stage
    return "request"


def _to_usage(rel_path: str, items_by_rel_path: dict[str, dict[str, Any]]) -> dict[str, str]:
    normalized = _normalize_ref(rel_path)
    matched = items_by_rel_path.get(normalized)
    if matched:
        return {
            "id": str(matched["id"]),
            "title": str(matched["title"]),
            "stage": str(matched["stage"]),
            "relPath": str(matched["relPath"]),
        }
    doc_id = Path(normalized).stem
    return {
        "id": doc_id or normalized,
        "title": doc_id or normalized,
        "stage": _infer_stage(normalized, doc_id),
        "relPath": normalized,
    }


def collect_viewer_items(repo_root: Path) -> list[dict[str, Any]]:
    repo_root = repo_root.resolve()
    items: list[dict[str, Any]] = []
    promoted_sources: set[str] = set()
    usage_map: dict[str, list[dict[str, str]]] = {}
    manual_used_by: dict[str, list[str]] = {}

    for family in DOC_FAMILIES:
        directory = repo_root / family.directory
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.md")):
            if not path.name.startswith(family.prefixes):
                continue
            content = _read_text(path)
            lines = content.splitlines()
            rel_path = path.relative_to(repo_root).as_posix()
            title = _parse_title(lines, path.stem)
            references = _extract_references(content, lines)
            manual_used_by[rel_path] = _section_links(content, "Used by")
            for ref in references:
                if ref["kind"] == "from":
                    promoted_sources.add(_normalize_ref(ref["path"]))
            stat = path.stat()
            items.append(
                {
                    "id": path.stem,
                    "title": title,
                    "stage": family.stage,
                    "path": str(path),
                    "relPath": rel_path,
                    "filename": path.name,
                    "updatedAt": stat.st_mtime_ns,
                    "indicators": _parse_indicators(lines),
                    "summaryPoints": _build_summary_points(content, title),
                    "acceptanceCriteria": _summary_entries(content, "Acceptance criteria", 6),
                    "lineCount": len(lines),
                    "charCount": len(content),
                    "isPromoted": False,
                    "references": references,
                    "usedBy": [],
                }
            )

    items_by_rel_path = {str(item["relPath"]): item for item in items}
    for item in items:
        rel_path = str(item["relPath"])
        item["isPromoted"] = rel_path in promoted_sources
        for ref in item["references"]:
            target = _normalize_ref(str(ref["path"]))
            if target in items_by_rel_path:
                usage_map.setdefault(target, []).append(
                    {
                        "id": str(item["id"]),
                        "title": str(item["title"]),
                        "stage": str(item["stage"]),
                        "relPath": rel_path,
                    }
                )

    for item in items:
        rel_path = str(item["relPath"])
        usages = usage_map.get(rel_path, [])
        for link in manual_used_by.get(rel_path, []):
            usage = _to_usage(link, items_by_rel_path)
            if not any(existing["relPath"] == usage["relPath"] for existing in usages):
                usages.append(usage)
        item["usedBy"] = sorted(usages, key=lambda usage: (STAGE_ORDER.get(usage["stage"], 99), usage["id"]))

    items.sort(key=lambda item: (STAGE_ORDER.get(str(item["stage"]), 99), str(item["id"])))
    for item in items:
        item["updatedAt"] = datetime.fromtimestamp(Path(str(item["path"])).stat().st_mtime).isoformat()
    return items


def viewer_data_payload(repo_root: Path, selected_id: str | None = None) -> dict[str, Any]:
    return {
        "root": str(repo_root.resolve()),
        "items": collect_viewer_items(repo_root),
        "updateInfo": get_update_info(_current_version()).to_payload(),
        "selectedId": selected_id,
        "changedPaths": [],
        "canResetProjectRoot": False,
        "canBootstrapLogics": False,
        "bootstrapLogicsTitle": "Local viewer is read-only. Use the CLI to bootstrap Logics.",
        "canLaunchCodex": False,
        "canLaunchClaude": False,
        "canRepairLogicsKit": False,
        "canPublishRelease": False,
        "shouldRecommendCheckEnvironment": False,
    }


def read_doc_payload(repo_root: Path, rel_path: str) -> dict[str, Any]:
    normalized, absolute = _resolve_repo_doc_path(repo_root, rel_path)
    return {
        "path": normalized,
        "content": _read_text(absolute),
    }


def _resolve_repo_doc_path(repo_root: Path, rel_path: str) -> tuple[str, Path]:
    normalized = unquote(rel_path).replace("\\", "/").lstrip("/")
    absolute = (repo_root / normalized).resolve()
    root = repo_root.resolve()
    if root != absolute and root not in absolute.parents:
        raise ValueError("Document path escapes repository root.")
    if not absolute.is_file():
        raise FileNotFoundError(normalized)
    return normalized, absolute


def edit_doc_payload(repo_root: Path, rel_path: str, *, launcher: Any | None = None) -> dict[str, str]:
    normalized, absolute = _resolve_repo_doc_path(repo_root, rel_path)
    command = _system_editor_command(absolute)
    runner = launcher or subprocess.Popen
    runner(command)
    return {
        "path": normalized,
        "command": command[0],
    }


def _system_editor_command(path: Path) -> list[str]:
    if sys.platform == "darwin":
        return ["open", str(path)]
    if os.name == "nt":
        return ["cmd", "/c", "start", "", str(path)]
    return ["xdg-open", str(path)]


def _json_bytes(payload: Any) -> bytes:
    return json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")


class LogicsViewerServer(ThreadingHTTPServer):
    def __init__(self, server_address: tuple[str, int], repo_root: Path):
        self.repo_root = repo_root.resolve()
        super().__init__(server_address, LogicsViewerRequestHandler)


class LogicsViewerRequestHandler(BaseHTTPRequestHandler):
    server: LogicsViewerServer

    def log_message(self, format: str, *args: object) -> None:
        return

    def _send_bytes(self, content: bytes, *, status: int = 200, content_type: str = "application/octet-stream") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(content)
        except (BrokenPipeError, ConnectionResetError):
            return

    def _send_json(self, payload: Any, *, status: int = 200) -> None:
        self._send_bytes(_json_bytes(payload), status=status, content_type="application/json; charset=utf-8")

    def _send_error_json(self, status: HTTPStatus, message: str) -> None:
        self._send_json({"ok": False, "error": message}, status=status.value)

    def _serve_file(self, path: Path) -> None:
        if not path.is_file():
            self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
            return
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or path.suffix in {".js", ".css", ".html"}:
            content_type = f"{content_type}; charset=utf-8"
        self._send_bytes(path.read_bytes(), content_type=content_type)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        route = parsed.path
        if route == "/":
            self._serve_file(VIEWER_ROOT / "index.html")
            return
        if route == "/browser-host.js":
            self._serve_file(VIEWER_ROOT / "browser-host.js")
            return
        if route == "/viewer.css":
            self._serve_file(VIEWER_ROOT / "viewer.css")
            return
        if route == "/vendor/mermaid.min.js":
            vendor_path = DIST_VENDOR_ROOT / "mermaid.min.js"
            if not vendor_path.is_file():
                vendor_path = NODE_MERMAID_ROOT / "mermaid.min.js"
            if not vendor_path.is_file():
                vendor_path = PACKAGE_VENDOR_ROOT / "mermaid.min.js"
            self._serve_file(vendor_path)
            return
        if route.startswith("/media/"):
            media_path = (SHARED_MEDIA_ROOT / route.removeprefix("/media/")).resolve()
            if SHARED_MEDIA_ROOT.resolve() != media_path and SHARED_MEDIA_ROOT.resolve() not in media_path.parents:
                self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
                return
            self._serve_file(media_path)
            return
        if route == "/api/items":
            self._send_json({"ok": True, "payload": viewer_data_payload(self.server.repo_root)})
            return
        if route == "/api/doc":
            rel_path = parse_qs(parsed.query).get("path", [""])[0]
            try:
                self._send_json({"ok": True, "document": read_doc_payload(self.server.repo_root, rel_path)})
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            return
        if route == "/api/lint":
            self._send_json({"ok": True, "payload": lint_payload(self.server.repo_root)})
            return
        if route == "/api/audit":
            self._send_json({"ok": True, "payload": audit_payload(self.server.repo_root)})
            return
        self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/refresh":
            self._send_json({"ok": True, "payload": viewer_data_payload(self.server.repo_root)})
            return
        if parsed.path == "/api/edit":
            rel_path = parse_qs(parsed.query).get("path", [""])[0]
            try:
                self._send_json({"ok": True, "document": edit_doc_payload(self.server.repo_root, rel_path)})
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")


def create_viewer_server(repo_root: Path, host: str = "127.0.0.1", port: int = 8765) -> LogicsViewerServer:
    return LogicsViewerServer((host, port), repo_root)


def render_start_status(url: str, repo_root: Path, *, focus: str | None = None) -> str:
    lines = [
        "Logics viewer running:",
        url,
        "",
        f"Repo: {repo_root.name}",
        "Mode: read-only",
        "Bind: localhost",
    ]
    if focus:
        lines.append(f"Focus: {focus}")
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="logics-manager view", description="Start the local read-only Logics browser viewer.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host. Defaults to 127.0.0.1.")
    parser.add_argument("--port", type=int, default=8765, help="Bind port. Use 0 to select an available port.")
    parser.add_argument("--focus", help="Open the viewer focused on a workflow ref or repo-relative Logics Markdown path.")
    parser.add_argument("--read", action="store_true", help="Open the focused item in the read preview. Requires --focus.")
    parser.add_argument("--open", action="store_true", help="Open the viewer in the default browser.")
    parser.add_argument("--no-open", action="store_true", help="Do not open the browser. This is the default.")
    return parser


def main(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    repo_root = find_repo_root(Path.cwd())
    if args.read and not args.focus:
        raise SystemExit("--read requires --focus.")
    try:
        focus = normalize_viewer_focus_target(repo_root, args.focus) if args.focus else None
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    server = create_viewer_server(repo_root, host=args.host, port=args.port)
    host, port = server.server_address[:2]
    url = build_viewer_url(str(host), int(port), focus=focus, read=bool(args.read))
    print(render_start_status(url, repo_root, focus=focus), flush=True)
    if args.open and not args.no_open:
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        return 0
    finally:
        server.server_close()
    return 0
