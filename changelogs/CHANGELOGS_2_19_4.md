# Logics Manager 2.19.4

## Logics Design sheet grid

Found by using 2.19.3 on a real asset need: a request for 10 emotes printed
`Create 10 icon sheet asset(s)` above `Canvas: 4x4 grid, 1024x1024`, announcing sixteen cells
for ten assets. Six cells were left for the generator to invent filler for or return blank, and
the slicer then had to detect them.

This is the same contradiction class 2.19.3 set out to remove: `grid_for` snapped to `4x4` for
any count from 5 to 16 instead of tracking the count.

- Sizes the sheet grid from the asset count. Ten assets now yield a `4x3` grid rather than a
  `4x4` one, and two yield `2x1` rather than `2x2`.
- Adds a parametrized test over counts 1 to 24 asserting that unused cells never add up to a
  whole row, so a grid heuristic can no longer waste one silently.

## Validation

- `npm run ci:check`
- `python3 -m pytest tests/python`
- `python3 -m ruff check`
- `logics-manager lint --require-status`
