# Logics Manager 2.19.3

## Logics Design prompt correctness

`design prompt` built every prompt from the same fixed lines, so the body contradicted the
layout the code had already computed. A `hero-image` request was told to keep assets separated
with padding, to arrange cells left-to-right, to stay readable at small sizes, and to export
each cell as an individual PNG — for a single full-bleed image.

- Builds the prompt body from a per-kind profile instead of fixed strings. A kind that is not
  sliceable can no longer receive grid, padding, or slicing instructions.
- Clamps `--count` to 1 for single-image kinds. `--kind hero-image` previously printed
  `Create 4 hero image asset(s)` directly above `Canvas: 1 image`.
- Derives the background default from the kind. `--transparent` and `--no-transparent` now only
  force the exception instead of defaulting every kind to transparent.
- Emits `machining` notes per kind, so a single image is told to export as one file rather than
  to slice grid cells.

## Prompts that hold the generator to a spec

- Adds `--cell-size`, which states the per-cell pixel size and derives the sheet total from the
  grid (`4x4 grid, 1024x1024 total with 256x256 cells`). Without a stated resolution, generators
  return whatever size they like, which is the usual cause of a sheet coming back too small to
  slice.
- Adds `--cells`, a pipe-separated manifest of what goes in each cell, in fill order. The
  manifest sets `--count`, so the two can no longer disagree. Sliceable kinds only.
- Adds `--safe-area`, which names and places the region kept free for composited text. Naming
  the zone without placing it leaves the subject dead centre.
- Adds `--palette` and `--style` as their own lines so a second generation stays consistent with
  the first.
- Lifts art-direction bullets from the `--ref` document body. The reference previously loaded the
  whole document and kept only its title.
- Forbids opaque or gradient backgrounds, cast shadows, and cropped assets in the exclusion list
  for sheet kinds. Asking for transparency once in the canvas line was not enough in practice.

## Output contract

- Adds a `sections` map (`subject`, `target`, `canvas`, `cells`, `safe_area`, `palette`, `style`,
  `quality`, `exclude`) alongside the assembled `prompt` string, for callers that want to
  recompose it. The `prompt` key is unchanged in shape, though its content differs by design.
- Removes an unused slug helper.

## Tests

- Adds the first test coverage for this module: 25 cases, including a parametrized check that
  every kind in `ASSET_KINDS` declares a profile, so the structural defect cannot return.

## Validation

- `python3 -m pytest tests/python`
- `python3 -m ruff check`
- `logics-manager lint --require-status`
- `logics-manager audit --group-by-doc`
