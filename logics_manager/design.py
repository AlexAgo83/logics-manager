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

# One profile per asset kind. The prompt body is assembled from these rather than concatenated
# from fixed strings, so a kind that is not sliceable can never be told to arrange cells in a
# grid or to trim padding after slicing. Adding a kind without a profile fails the test suite.
KIND_PROFILES: dict[str, dict[str, object]] = {
    "icon-sheet": {
        "sliceable": True,
        "transparent": True,
        "quality": "Clean silhouettes, consistent lighting and perspective, readable at 24px, 32px and 48px.",
        "exclude": [
            "text", "letters", "numbers", "labels", "grid lines", "watermarks",
            "background decoration", "any opaque or gradient background",
            "drop shadows cast onto the transparent background", "cropped or clipped assets",
        ],
        "machining": [
            "slice grid cells before resizing",
            "trim transparent padding only after slicing",
            "name files 01-name.png, 02-name.png, ...",
        ],
    },
    "object-set": {
        "sliceable": True,
        "transparent": True,
        "quality": "Consistent scale, lighting and palette across every object.",
        "exclude": [
            "text", "letters", "numbers", "labels", "watermarks", "background decoration",
            "cropped or clipped assets",
        ],
        "machining": [
            "slice grid cells before resizing",
            "trim transparent padding only after slicing",
            "name files 01-name.png, 02-name.png, ...",
        ],
    },
    "ui-icon-replacement": {
        "sliceable": True,
        "transparent": True,
        "quality": "Match the stroke weight and corner radius of the icons being replaced; readable at 16px and 24px.",
        "exclude": ["text", "letters", "numbers", "labels", "grid lines", "watermarks", "drop shadows on the transparent background"],
        "machining": [
            "slice grid cells before resizing",
            "trim transparent padding only after slicing",
            "keep the replaced icon's file name",
        ],
    },
    "hero-image": {
        "sliceable": False,
        "transparent": False,
        "quality": "Cinematic composition and lighting.",
        "quality_without_safe_area": "Keep one region low in detail so a title can be composited over it.",
        "exclude": ["text", "letters", "numbers", "logos", "watermarks", "UI chrome", "sponsor decals"],
        "machining": ["export as a single image", "no slicing"],
    },
    "game-object-with-metadata": {
        "sliceable": True,
        "transparent": True,
        "quality": "Each object readable in isolation; keep proportions comparable so they can share one in-game scale.",
        "exclude": [
            "text", "letters", "numbers", "labels", "watermarks", "background decoration",
            "cropped or clipped assets",
        ],
        "machining": [
            "slice grid cells before resizing",
            "trim transparent padding only after slicing",
            "record per-object metadata (name, tags, in-game scale) alongside each file",
        ],
    },
}

_SIZE = re.compile(r"^(\d+)\s*[x×]\s*(\d+)$")


def _profile(kind: str) -> dict[str, object]:
    profile = KIND_PROFILES.get(kind)
    if profile is None:  # pragma: no cover - guarded by ASSET_KINDS and the profile coverage test
        raise SystemExit(f"Unsupported asset kind: {kind}")
    return profile


def parse_cell_size(value: str) -> tuple[int, int]:
    match = _SIZE.match(value.strip())
    if not match:
        raise SystemExit("--cell-size must look like 256x256")
    width, height = int(match.group(1)), int(match.group(2))
    if width < 1 or height < 1:
        raise SystemExit("--cell-size must be positive")
    return width, height


def parse_cells(value: str) -> list[str]:
    """Pipe-separated per-cell descriptions, in fill order."""
    entries = [entry.strip() for entry in value.split("|")]
    entries = [entry for entry in entries if entry]
    if not entries:
        raise SystemExit("--cells must list at least one asset")
    return entries


def grid_for(count: int) -> tuple[int, int]:
    """Columns and rows for a sliceable sheet, filled left to right then top to bottom."""
    if count <= 1:
        return 1, 1
    if count <= 4:
        return 2, 2
    if count <= 16:
        return 4, 4
    return 4, -(-count // 4)


def _layout_for(kind: str, count: int) -> str:
    if not _profile(kind)["sliceable"]:
        return "1 image"
    columns, rows = grid_for(count)
    if columns == 1 and rows == 1:
        return "single asset"
    return f"{columns}x{rows} grid"


def _canvas_line(kind: str, count: int, transparent: bool, cell: tuple[int, int] | None) -> str:
    background = "transparent background PNG" if transparent else "opaque background"
    if not _profile(kind)["sliceable"]:
        size = f", {cell[0]}x{cell[1]}" if cell else ""
        return f"Canvas: one full-bleed image{size}; {background}. No cells, no panels, no padding between elements."
    columns, rows = grid_for(count)
    size = f", {columns * cell[0]}x{rows * cell[1]} total with {cell[0]}x{cell[1]} cells" if cell else ""
    return (
        f"Canvas: {columns}x{rows} grid{size}; {background}; one asset per cell, centered, "
        "with generous padding and no bleed between cells. Fill left-to-right, then top-to-bottom."
    )


# Art-direction bullets are the ones worth carrying into a generator prompt. The rest of a
# workflow doc is prose that would only dilute the instruction.
_ART_DIRECTION = re.compile(
    r"^\s*[-*]\s*(palette|colou?rs?|style|art direction|typography|iconography|do not|avoid|exclude)\b",
    re.I,
)


def art_direction_from(body: str) -> str:
    lines = [line.strip() for line in (body or "").splitlines() if _ART_DIRECTION.match(line)]
    return "\n".join(lines[:8])


def design_prompt_payload(
    repo_root: Path,
    *,
    need: str,
    kind: str = "object-set",
    count: int = 4,
    transparent: bool | None = None,
    generator_target: str = "general AI image generator",
    ref: str | None = None,
    cell_size: str | None = None,
    palette: str | None = None,
    style: str | None = None,
    safe_area: str | None = None,
    cells: str | None = None,
) -> dict[str, object]:
    if kind not in ASSET_KINDS:
        raise SystemExit(f"Unsupported asset kind: {kind}")
    if count < 1:
        raise SystemExit("--count must be >= 1")

    profile = _profile(kind)
    cell_list = parse_cells(cells) if cells else []
    if cell_list and not profile["sliceable"]:
        raise SystemExit(f"--cells needs a sliceable kind; {kind} produces a single image")
    # The manifest is the authority on how many assets there are, so the two can never disagree.
    if cell_list:
        count = len(cell_list)
    # A single-image kind cannot host several assets. The previous default of 4 produced
    # "Create 4 hero image asset(s)" directly above "Canvas: 1 image".
    if not profile["sliceable"]:
        count = 1
    if transparent is None:
        transparent = bool(profile["transparent"])
    cell = parse_cell_size(cell_size) if cell_size else None

    ref_context = ""
    if ref:
        doc = _load_workflow_docs(repo_root).get(ref)
        if not doc:
            raise SystemExit(f"Unknown workflow ref: {ref}")
        ref_context = f"\nWorkflow context: {ref} - {doc.title}."
        constraints = art_direction_from(getattr(doc, "body", "") or "")
        if constraints:
            ref_context += f"\nConstraints from that doc:\n{constraints}"

    sections: dict[str, str] = {
        "subject": f"Create {count} {kind.replace('-', ' ')} asset(s) for: {need}.{ref_context}".strip(),
        "target": f"Generator target: {generator_target}.",
        "canvas": _canvas_line(kind, count, transparent, cell),
        "quality": " ".join(
            part
            for part in (str(profile["quality"]), None if safe_area else profile.get("quality_without_safe_area"))
            if part
        ),
        "exclude": "Exclude: " + ", ".join(str(item) for item in profile["exclude"]) + ".",
    }
    if cell_list:
        sections["cells"] = "Assets, in fill order:\n" + "\n".join(
            f"{index}. {entry}" for index, entry in enumerate(cell_list, start=1)
        )
    if palette:
        sections["palette"] = f"Palette: {palette}. Do not introduce colours outside it."
    if style:
        sections["style"] = f"Style: {style}."
    if safe_area:
        # Generators need the reserved zone named and placed, not merely implied. "Keep a region
        # free" produces a subject dead centre; "keep the left half dark" produces usable art.
        sections["safe_area"] = (
            f"Reserved zone: keep {safe_area} low in detail and free of subject matter; "
            "text is composited there."
        )

    order = ("subject", "target", "canvas", "cells", "safe_area", "palette", "style", "quality", "exclude")
    prompt = "\n".join(sections[key] for key in order if key in sections)

    return {
        "ok": True,
        "kind": "logics-design-prompt-pack",
        "asset_kind": kind,
        "count": count,
        "layout": _layout_for(kind, count),
        "cell_size": f"{cell[0]}x{cell[1]}" if cell else "",
        "sliceable": bool(profile["sliceable"]),
        "transparent": transparent,
        "generator_target": generator_target,
        "ref": ref or "",
        "palette": palette or "",
        "style": style or "",
        "safe_area": safe_area or "",
        "cells": cell_list,
        "prompt": prompt,
        "sections": sections,
        "machining": list(profile["machining"]),
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
    prompt.add_argument("--cell-size", help="Per-cell pixel size such as 256x256; the sheet total is derived from the grid.")
    prompt.add_argument("--palette", help="Palette to hold the generator to, for example 'near-black #0f0d12 and orange #ff6a1f'.")
    prompt.add_argument("--style", help="Style anchor, for example 'glossy 3D board-game token'.")
    prompt.add_argument("--safe-area", help="Region to keep clear for composited text, for example 'the left half' or 'the bottom third'.")
    prompt.add_argument("--cells", help="Pipe-separated per-cell descriptions in fill order; sets --count. Example: 'create-league: a trophy plinth|join-league: a keycard'.")
    # The default comes from the kind; these flags only force the exception.
    prompt.add_argument("--transparent", dest="transparent", action="store_true", default=None)
    prompt.add_argument("--no-transparent", dest="transparent", action="store_false")
    prompt.add_argument("--out")
    prompt.add_argument("--format", choices=("text", "json"), default="text")
    args = parser.parse_args(argv)
    repo_root = find_repo_root(Path.cwd())
    payload = design_prompt_payload(
        repo_root,
        need=args.text,
        kind=args.kind,
        count=args.count,
        transparent=args.transparent,
        generator_target=args.generator_target,
        ref=args.ref,
        cell_size=args.cell_size,
        palette=args.palette,
        style=args.style,
        safe_area=args.safe_area,
        cells=args.cells,
    )
    if args.out:
        payload = write_prompt_pack(repo_root, payload, args.out)
    if args.format == "json":
        print(render_payload(payload, "json"))
    else:
        print(payload["prompt"])
        if args.out:
            print(f"\nWrote {payload['output_dir']}")
    return 0
