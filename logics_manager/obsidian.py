from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import ConfigError, find_repo_root, load_repo_config
from .doc_parsing import indicator_value


MANAGED_MARKER_KEY = "logics_projection"
MANAGED_MARKER_VALUE = "obsidian"
DOC_TYPES = {
    "request": ("logics/request", "req"),
    "backlog": ("logics/backlog", "item"),
    "task": ("logics/tasks", "task"),
    "product": ("logics/product", "prod"),
    "architecture": ("logics/architecture", "adr"),
    "spec": ("logics/specs", "spec"),
}
INDICATORS = ("Status", "Owner", "Understanding", "Confidence", "Progress", "Theme")


@dataclass(frozen=True)
class ProjectionDoc:
    path: Path
    rel_path: str
    doc_type: str
    ref: str
    title: str
    indicators: dict[str, str]
    content: str


_indicator_value = indicator_value


def _title_from_lines(lines: list[str]) -> str:
    for line in lines:
        if line.startswith("## "):
            payload = line.removeprefix("## ").strip()
            if " - " in payload:
                return payload.split(" - ", 1)[1].strip()
            return payload
    return ""


def _strip_managed_frontmatter(text: str) -> tuple[str, dict[str, Any] | None, bool]:
    if not text.startswith("---\n"):
        return text, None, False
    end = text.find("\n---\n", 4)
    if end < 0:
        return text, None, False
    raw = text[4:end]
    parsed = _parse_frontmatter(raw)
    if parsed.get(MANAGED_MARKER_KEY) != MANAGED_MARKER_VALUE:
        return text, parsed, False
    return text[end + len("\n---\n"):], parsed, True


def _strip_any_frontmatter(text: str) -> str:
    if not text.startswith("---\n"):
        return text
    end = text.find("\n---\n", 4)
    if end < 0:
        return text
    return text[end + len("\n---\n"):]


def _parse_frontmatter(raw: str) -> dict[str, Any]:
    values: dict[str, Any] = {}
    current_list_key: str | None = None
    for line in raw.splitlines():
        if not line.strip():
            continue
        if line.startswith("  - ") and current_list_key:
            values.setdefault(current_list_key, []).append(_unquote(line[4:].strip()))
            continue
        current_list_key = None
        if ":" not in line:
            continue
        key, raw_value = line.split(":", 1)
        key = key.strip()
        value = raw_value.strip()
        if value == "":
            values[key] = []
            current_list_key = key
            continue
        values[key] = _unquote(value)
    return values


def _unquote(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] == '"':
        return value[1:-1].replace('\\"', '"').replace("\\\\", "\\")
    return value


def _quote(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def _slug(value: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return text or "unknown"


def _tag(value: str) -> str:
    return _slug(value).replace("-", "/")


def _frontmatter_for(doc: ProjectionDoc) -> dict[str, Any]:
    status = doc.indicators.get("Status", "")
    theme = doc.indicators.get("Theme", "")
    tags = [
        "logics",
        f"logics/{doc.doc_type}",
    ]
    if status:
        tags.append(f"logics/status/{_tag(status)}")
    if theme:
        tags.append(f"logics/theme/{_tag(theme)}")
    payload: dict[str, Any] = {
        MANAGED_MARKER_KEY: MANAGED_MARKER_VALUE,
        "type": doc.doc_type,
        "ref": doc.ref,
        "status": status,
        "title": doc.title,
        "aliases": [doc.title] if doc.title else [],
        "tags": sorted(set(tags)),
    }
    for key in ("Owner", "Understanding", "Confidence", "Progress", "Theme"):
        value = doc.indicators.get(key)
        if value:
            payload[key.lower()] = value
    return payload


def _render_frontmatter(payload: dict[str, Any]) -> str:
    ordered = [
        MANAGED_MARKER_KEY,
        "type",
        "ref",
        "status",
        "owner",
        "understanding",
        "confidence",
        "progress",
        "theme",
        "title",
        "aliases",
        "tags",
    ]
    lines = ["---"]
    for key in ordered:
        if key not in payload:
            continue
        value = payload[key]
        if isinstance(value, list):
            lines.append(f"{key}:")
            for item in value:
                lines.append(f"  - {_quote(str(item))}")
        else:
            lines.append(f"{key}: {_quote(str(value))}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def _collect_projection_docs(repo_root: Path) -> list[ProjectionDoc]:
    docs: list[ProjectionDoc] = []
    for doc_type, (rel_dir, prefix) in DOC_TYPES.items():
        directory = repo_root / rel_dir
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.md")):
            if path.name == "README.md":
                continue
            content = path.read_text(encoding="utf-8")
            canonical = _strip_any_frontmatter(content)
            lines = canonical.splitlines()
            ref = path.stem
            if not ref.startswith(f"{prefix}_"):
                continue
            indicators = {key: value for key in INDICATORS if (value := _indicator_value(lines, key))}
            docs.append(
                ProjectionDoc(
                    path=path,
                    rel_path=path.relative_to(repo_root).as_posix(),
                    doc_type=doc_type,
                    ref=ref,
                    title=_title_from_lines(lines),
                    indicators=indicators,
                    content=content,
                )
            )
    return docs


def _frontmatter_drift(doc: ProjectionDoc, frontmatter: dict[str, Any] | None) -> list[str]:
    if not frontmatter:
        return []
    expected = _frontmatter_for(doc)
    checks = {
        "type": expected.get("type", ""),
        "ref": expected.get("ref", ""),
        "status": expected.get("status", ""),
        "title": expected.get("title", ""),
    }
    issues: list[str] = []
    for key, expected_value in checks.items():
        actual = str(frontmatter.get(key, ""))
        if actual != str(expected_value):
            issues.append(f"Obsidian frontmatter drift: {key} is `{actual}` but canonical value is `{expected_value}`")
    return issues


def validate_frontmatter_file(path: Path, doc_type: str) -> list[str]:
    prefix = DOC_TYPES.get(doc_type, ("", ""))[1]
    content = path.read_text(encoding="utf-8")
    canonical, frontmatter, _managed = _strip_managed_frontmatter(content)
    if frontmatter is None and content.startswith("---\n"):
        end = content.find("\n---\n", 4)
        if end >= 0:
            frontmatter = _parse_frontmatter(content[4:end])
            canonical = content[end + len("\n---\n"):]
    if frontmatter is None:
        return []
    lines = canonical.splitlines()
    indicators = {key: value for key in INDICATORS if (value := _indicator_value(lines, key))}
    doc = ProjectionDoc(
        path=path,
        rel_path=path.as_posix(),
        doc_type=doc_type,
        ref=path.stem if path.stem.startswith(f"{prefix}_") else path.stem,
        title=_title_from_lines(lines),
        indicators=indicators,
        content=content,
    )
    return _frontmatter_drift(doc, frontmatter)


def obsidian_payload(repo_root: Path, *, action: str, check: bool = False, dry_run: bool = False, force: bool = False) -> dict[str, Any]:
    config, _path = load_repo_config(repo_root)
    enabled = bool(config.get("obsidian", {}).get("enabled"))
    docs = _collect_projection_docs(repo_root)
    changed: list[str] = []
    drift: list[dict[str, str]] = []
    skipped_reason = ""

    if action == "sync" and not enabled and not force:
        skipped_reason = "obsidian.enabled is false; no projection was written."
        return {
            "ok": True,
            "enabled": enabled,
            "action": action,
            "checked": check,
            "dry_run": dry_run,
            "changed": [],
            "changed_count": 0,
            "drift": [],
            "drift_count": 0,
            "skipped_reason": skipped_reason,
        }

    for doc in docs:
        canonical, existing_frontmatter, managed = _strip_managed_frontmatter(doc.content)
        if action == "clean":
            if managed:
                changed.append(doc.rel_path)
                if not check and not dry_run:
                    doc.path.write_text(canonical, encoding="utf-8")
            continue

        fresh_doc = ProjectionDoc(
            path=doc.path,
            rel_path=doc.rel_path,
            doc_type=doc.doc_type,
            ref=doc.ref,
            title=doc.title,
            indicators=doc.indicators,
            content=canonical,
        )
        next_content = _render_frontmatter(_frontmatter_for(fresh_doc)) + canonical
        if next_content != doc.content:
            changed.append(doc.rel_path)
        if existing_frontmatter is not None:
            for issue in _frontmatter_drift(fresh_doc, existing_frontmatter):
                drift.append({"path": doc.rel_path, "message": issue})
        if not check and not dry_run and next_content != doc.content:
            doc.path.write_text(next_content, encoding="utf-8")

    ok = not check or (not changed and not drift)
    return {
        "ok": ok,
        "enabled": enabled,
        "action": action,
        "checked": check,
        "dry_run": dry_run,
        "changed": changed,
        "changed_count": len(changed),
        "drift": drift,
        "drift_count": len(drift),
        "skipped_reason": skipped_reason,
    }


def render_obsidian(payload: dict[str, Any], output_format: str = "text") -> str:
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)
    action = payload["action"]
    if payload.get("skipped_reason"):
        return f"Obsidian {action}: skipped ({payload['skipped_reason']})"
    if payload.get("checked"):
        if payload["ok"]:
            return f"Obsidian {action} --check: OK"
        return "\n".join(
            [
                f"Obsidian {action} --check: FAILED",
                f"Changed files: {payload['changed_count']}; drift findings: {payload['drift_count']}",
                *[f"- {path}" for path in payload.get("changed", [])],
                *[f"- {item['path']}: {item['message']}" for item in payload.get("drift", [])],
            ]
        )
    verb = "would update" if payload.get("dry_run") else "updated"
    if action == "clean":
        verb = "would clean" if payload.get("dry_run") else "cleaned"
    return f"Obsidian {action}: {verb} {payload['changed_count']} file(s)"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="logics-manager obsidian", description="Manage the opt-in Obsidian projection.")
    subparsers = parser.add_subparsers(dest="command")
    for name in ("sync", "clean"):
        sub = subparsers.add_parser(name)
        sub.add_argument("--check", action="store_true")
        sub.add_argument("--dry-run", action="store_true")
        sub.add_argument("--format", choices=("text", "json"), default="text")
        if name == "sync":
            sub.add_argument("--force", action="store_true", help="Write projection even when obsidian.enabled is false.")
    return parser


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command not in {"sync", "clean"}:
        parser.print_help()
        return 1
    repo_root = find_repo_root(Path.cwd())
    payload = obsidian_payload(
        repo_root,
        action=args.command,
        check=bool(args.check),
        dry_run=bool(args.dry_run),
        force=bool(getattr(args, "force", False)),
    )
    print(render_obsidian(payload, output_format=args.format))
    return 0 if payload["ok"] else 1
