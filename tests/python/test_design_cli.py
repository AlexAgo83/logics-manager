from __future__ import annotations

import json
from pathlib import Path

import pytest

from logics_manager.design import (
    ASSET_KINDS,
    KIND_PROFILES,
    art_direction_from,
    design_prompt_payload,
    grid_for,
    parse_cell_size,
    parse_cells,
    write_prompt_pack,
)

# Imperative sheet instructions, not bare words: the hero canvas legitimately says "no cells,
# no panels" as a prohibition, which is the opposite of telling the generator to build a grid.
SHEET_INSTRUCTIONS = (
    "one asset per cell",
    "fill left-to-right",
    "arrange assets",
    "slice",
    "trim transparent padding",
    "x2 grid",
    "x4 grid",
)


def payload(**kwargs: object) -> dict[str, object]:
    options: dict[str, object] = {"need": "garage upgrade art"}
    options.update(kwargs)
    return design_prompt_payload(Path.cwd(), **options)  # type: ignore[arg-type]


@pytest.mark.parametrize("kind", ASSET_KINDS)
def test_every_declared_kind_has_a_profile(kind: str) -> None:
    # Guards the structural bug: the prompt body is built from the profile, so a kind added to
    # ASSET_KINDS without one would silently fall back to another kind's instructions.
    profile = KIND_PROFILES[kind]
    assert isinstance(profile["sliceable"], bool)
    assert isinstance(profile["transparent"], bool)
    assert profile["quality"]
    assert profile["exclude"]
    assert profile["machining"]


@pytest.mark.parametrize("kind", [kind for kind in ASSET_KINDS if not KIND_PROFILES[kind]["sliceable"]])
def test_single_image_kinds_never_mention_slicing(kind: str) -> None:
    result = payload(kind=kind, count=4)
    text = str(result["prompt"]).lower() + " " + " ".join(str(item) for item in result["machining"]).lower()
    for phrase in SHEET_INSTRUCTIONS:
        assert phrase not in text, f"{kind} prompt still instructs {phrase!r}"


def test_single_image_kind_clamps_the_count() -> None:
    result = payload(kind="hero-image", count=4)
    assert result["count"] == 1
    assert "Create 1 hero image asset(s)" in str(result["prompt"])
    assert result["layout"] == "1 image"


def test_transparency_defaults_to_the_kind() -> None:
    assert payload(kind="icon-sheet")["transparent"] is True
    assert payload(kind="hero-image")["transparent"] is False
    # The flag still forces the exception.
    assert payload(kind="hero-image", transparent=True)["transparent"] is True


@pytest.mark.parametrize(
    ("count", "expected"),
    [(1, (1, 1)), (4, (2, 2)), (5, (4, 2)), (10, (4, 3)), (16, (4, 4)), (17, (4, 5)), (24, (4, 6))],
)
def test_grid_shape(count: int, expected: tuple[int, int]) -> None:
    assert grid_for(count) == expected


@pytest.mark.parametrize("count", range(1, 25))
def test_grid_never_wastes_a_whole_row(count: int) -> None:
    # Announcing a 4x4 grid for 10 assets left six cells unaccounted for; the generator either
    # invents filler or returns blanks that the slicer then has to detect.
    columns, rows = grid_for(count)
    assert columns * rows >= count
    assert (columns * rows) - count < columns


def test_sheet_total_is_the_grid_times_the_cell() -> None:
    result = payload(kind="icon-sheet", count=16, cell_size="256x256")
    assert "1024x1024 total with 256x256 cells" in str(result["prompt"])
    assert result["cell_size"] == "256x256"


def test_cell_size_on_a_single_image_states_the_frame() -> None:
    result = payload(kind="hero-image", cell_size="1672x941")
    assert "one full-bleed image, 1672x941" in str(result["prompt"])


def test_cell_size_rejects_junk() -> None:
    with pytest.raises(SystemExit):
        parse_cell_size("big")


def test_palette_and_style_are_carried_through() -> None:
    result = payload(kind="icon-sheet", palette="near-black #0f0d12 and orange #ff6a1f", style="glossy 3D token")
    prompt = str(result["prompt"])
    assert "Palette: near-black #0f0d12 and orange #ff6a1f" in prompt
    assert "Style: glossy 3D token" in prompt
    # Omitted when not supplied, rather than emitting an empty line.
    assert "Palette:" not in str(payload(kind="icon-sheet")["prompt"])


def test_safe_area_places_the_reserved_zone() -> None:
    result = payload(kind="hero-image", safe_area="the left half")
    prompt = str(result["prompt"])
    assert "keep the left half low in detail" in prompt
    # The vague fallback drops once the zone is placed, instead of saying it twice.
    assert "Keep one region low in detail" not in prompt
    assert "Keep one region low in detail" in str(payload(kind="hero-image")["prompt"])


def test_sheet_kinds_forbid_an_opaque_background() -> None:
    # The cr-league icon sheet came back with a gradient background despite the canvas line
    # asking for transparency, so the prohibition also belongs in the exclusion list.
    exclude = str(payload(kind="icon-sheet", count=16)["sections"]["exclude"])
    assert "any opaque or gradient background" in exclude
    assert "cropped or clipped assets" in exclude


def test_cells_drive_the_count_and_the_grid() -> None:
    # The manifest is the authority: --count can no longer disagree with the listed assets.
    result = payload(kind="icon-sheet", count=16, cell_size="256x256", cells="a: one|b: two|c: three")
    assert result["count"] == 3
    prompt = str(result["prompt"])
    assert "2x2 grid, 512x512 total" in prompt
    assert "1. a: one" in prompt
    assert "3. c: three" in prompt


def test_cells_are_rejected_on_a_single_image_kind() -> None:
    with pytest.raises(SystemExit):
        payload(kind="hero-image", cells="a: one|b: two")


def test_parse_cells_trims_and_rejects_empty() -> None:
    assert parse_cells(" a | b |") == ["a", "b"]
    with pytest.raises(SystemExit):
        parse_cells("  |  ")


def test_sections_expose_the_same_body_as_the_prompt() -> None:
    result = payload(kind="icon-sheet", count=16)
    sections = result["sections"]
    assert isinstance(sections, dict)
    for value in sections.values():
        assert value in str(result["prompt"])


def test_art_direction_keeps_only_constraint_bullets() -> None:
    body = """
# Brief
Some prose that should not travel.

- Palette: charcoal and orange only
- Style: board-game token
- Do not use blue
- The team ships on Friday
"""
    extracted = art_direction_from(body)
    assert "Palette: charcoal and orange only" in extracted
    assert "Do not use blue" in extracted
    assert "ships on Friday" not in extracted
    assert "prose that should not travel" not in extracted


def test_rejects_unknown_kind_and_zero_count() -> None:
    with pytest.raises(SystemExit):
        payload(kind="poster")
    with pytest.raises(SystemExit):
        payload(kind="icon-sheet", count=0)


def test_write_prompt_pack_emits_both_files(tmp_path: Path) -> None:
    result = write_prompt_pack(tmp_path, payload(kind="icon-sheet", count=16), "design/icons")
    written = json.loads((tmp_path / "design" / "icons" / "prompt-pack.json").read_text(encoding="utf-8"))
    assert written["asset_kind"] == "icon-sheet"
    assert (tmp_path / "design" / "icons" / "prompt.md").read_text(encoding="utf-8").strip() == str(result["prompt"])
