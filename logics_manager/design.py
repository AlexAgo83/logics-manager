from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from .cli_output import render_payload
from .config import find_repo_root
from .path_utils import resolve_repo_output_path
from .sync import _load_workflow_docs

ASSET_KINDS = ("icon-sheet", "object-set", "hero-image", "ui-icon-replacement", "game-object-with-metadata")


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "asset-pack"


def _layout_for(kind: str, count: int) -> str:
    if kind == "hero-image":
        return "1 image"
    if count <= 1:
        return "single asset"
    if count <= 4:
        return "2x2 grid"
    if count <= 16:
        return "4x4 grid"
    return "multiple 4x4 grids"


def design_prompt_payload(
    repo_root: Path,
    *,
    need: str,
    kind: str = "object-set",
    count: int = 4,
    transparent: bool = True,
    generator_target: str = "general AI image generator",
    ref: str | None = None,
) -> dict[str, object]:
    if kind not in ASSET_KINDS:
        raise SystemExit(f"Unsupported asset kind: {kind}")
    if count < 1:
        raise SystemExit("--count must be >= 1")
    ref_context = ""
    if ref:
        doc = _load_workflow_docs(repo_root).get(ref)
        if not doc:
            raise SystemExit(f"Unknown workflow ref: {ref}")
        ref_context = f"\nWorkflow context: {ref} - {doc.title}."
    transparency = "transparent background PNG" if transparent else "opaque background"
    layout = _layout_for(kind, count)
    prompt = "\n".join([
        f"Create {count} {kind.replace('-', ' ')} asset(s) for: {need}.{ref_context}".strip(),
        f"Generator target: {generator_target}.",
        f"Canvas: {layout}; use {transparency}; keep each asset separated with generous padding.",
        "For sheets, arrange assets left-to-right then top-to-bottom. Do not add labels, numbers, watermarks, UI chrome, or background decoration.",
        "Keep shapes clean, readable at small sizes, and consistent in lighting, perspective, and palette.",
        "Asset extraction notes: export each cell as an individual PNG, trim transparent padding only after slicing, and keep original order in filenames.",
    ])
    return {
        "ok": True,
        "kind": "logics-design-prompt-pack",
        "asset_kind": kind,
        "count": count,
        "layout": layout,
        "transparent": transparent,
        "generator_target": generator_target,
        "ref": ref or "",
        "prompt": prompt,
        "machining": [
            "slice grid cells before resizing",
            "preserve transparency when requested",
            "name files 01-name.png, 02-name.png, ...",
        ],
    }


def write_prompt_pack(repo_root: Path, payload: dict[str, object], out: str) -> dict[str, object]:
    target, relative = resolve_repo_output_path(repo_root, out)
    target.mkdir(parents=True, exist_ok=True)
    (target / "prompt.md").write_text(str(payload["prompt"]) + "\n", encoding="utf-8")
    (target / "prompt-pack.json").write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return {**payload, "output_dir": relative, "files": [f"{relative}/prompt.md", f"{relative}/prompt-pack.json"]}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="logics-manager design")
    sub = parser.add_subparsers(dest="command", required=True)
    prompt = sub.add_parser("prompt")
    prompt.add_argument("--text", required=True)
    prompt.add_argument("--kind", choices=ASSET_KINDS, default="object-set")
    prompt.add_argument("--count", type=int, default=4)
    prompt.add_argument("--ref")
    prompt.add_argument("--generator-target", default="general AI image generator")
    prompt.add_argument("--transparent", dest="transparent", action="store_true", default=True)
    prompt.add_argument("--no-transparent", dest="transparent", action="store_false")
    prompt.add_argument("--out")
    prompt.add_argument("--format", choices=("text", "json"), default="text")
    args = parser.parse_args(argv)
    repo_root = find_repo_root(Path.cwd())
    payload = design_prompt_payload(repo_root, need=args.text, kind=args.kind, count=args.count, transparent=args.transparent, generator_target=args.generator_target, ref=args.ref)
    if args.out:
        payload = write_prompt_pack(repo_root, payload, args.out)
    if args.format == "json":
        print(render_payload(payload, "json"))
    else:
        print(payload["prompt"])
        if args.out:
            print(f"\nWrote {payload['output_dir']}")
    return 0
