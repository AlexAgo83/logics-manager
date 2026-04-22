from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from os import path as os_path
from pathlib import Path

from .config import find_repo_root


@dataclass(frozen=True)
class Entry:
    path: Path
    doc_ref: str
    title: str
    status: str | None
    progress: str | None


SECTION_DEFINITIONS = (
    ("Architecture decisions", "logics/architecture", False),
    ("Product briefs", "logics/product", False),
    ("Requests", "logics/request", False),
    ("Backlog", "logics/backlog", True),
    ("Tasks", "logics/tasks", True),
)

SECTION_COUNT_KEYS = ("architecture", "product", "request", "backlog", "task")


def _parse_doc(path: Path) -> Entry:
    lines = path.read_text(encoding="utf-8").splitlines()
    doc_ref = path.stem
    title = ""
    status: str | None = None
    progress: str | None = None

    for line in lines:
        if line.startswith("## "):
            payload = line.removeprefix("## ").strip()
            if " - " in payload:
                maybe_ref, maybe_title = payload.split(" - ", 1)
                doc_ref = maybe_ref.strip()
                title = maybe_title.strip()
            else:
                title = payload
            continue
        if line.startswith("> Status:"):
            status = line.split(":", 1)[1].strip()
            continue
        if line.startswith("> Progress:"):
            progress = line.split(":", 1)[1].strip()
    if not title:
        title = "(missing title)"
    return Entry(path=path, doc_ref=doc_ref, title=title, status=status, progress=progress)


def _collect_paths(repo_root: Path, rel_dir: str) -> list[Path]:
    directory = repo_root / rel_dir
    if not directory.is_dir():
        return []
    return sorted(directory.glob("*.md"))


def _collect_entries(repo_root: Path, rel_dir: str) -> list[Entry]:
    return [_parse_doc(path) for path in _collect_paths(repo_root, rel_dir)]


def _render_section(title: str, entries: list[Entry], show_progress: bool, out_dir: Path) -> str:
    lines: list[str] = [f"## {title}", ""]
    if not entries:
        lines.append("_None_")
        lines.append("")
        return "\n".join(lines)

    lines.extend(["| Doc | Title | Status | Progress | Path |", "|---|---|---|---|---|"])

    for entry in entries:
        rel = os_path.relpath(entry.path, start=out_dir).replace(os.sep, "/")
        doc_link = f"[{entry.doc_ref}]({rel})"
        lines.append(f"| {doc_link} | {entry.title} | {entry.status or ''} | {entry.progress or ''} | {rel} |")
    lines.append("")
    return "\n".join(lines)


def index_payload(repo_root: Path, *, out: str = "logics/INDEX.md") -> dict[str, object]:
    repo_root = repo_root.resolve()
    sections: list[tuple[str, list[Entry], bool]] = []
    for title, rel_dir, show_progress in SECTION_DEFINITIONS:
        sections.append((title, _collect_entries(repo_root, rel_dir), show_progress))

    out_path = (repo_root / out).resolve()
    out_dir = out_path.parent
    content = "\n".join(
        [
            "# Logics Index",
            "",
            *[_render_section(title, entries, show_progress, out_dir) for title, entries, show_progress in sections],
        ]
    ).rstrip() + "\n"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(content, encoding="utf-8")

    try:
        printable = out_path.relative_to(repo_root)
    except ValueError:
        printable = out_path

    counts = {key: len(entries) for key, (_, entries, _) in zip(SECTION_COUNT_KEYS, sections)}
    return {
        "ok": True,
        "output_path": str(printable),
        "counts": counts,
    }


def render_index(repo_root: Path, *, out: str = "logics/INDEX.md", output_format: str = "text") -> str:
    payload = index_payload(repo_root, out=out)
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)
    return f"Wrote {payload['output_path']}"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="logics-manager index",
        description="Generate logics/INDEX.md from workflow docs.",
    )
    parser.add_argument("--out", default="logics/INDEX.md")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    return parser


def main(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    repo_root = find_repo_root(Path.cwd())
    output = render_index(repo_root, out=args.out, output_format=args.format)
    print(output)
    return 0
