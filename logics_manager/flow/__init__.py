from __future__ import annotations

from pathlib import Path

_CHUNKS = (
    "_listing.py",
    "_help_core.py",
    "_help_variants.py",
    "_doc_ops.py",
    "_closeout_validation.py",
    "_native_builders.py",
    "_companion_builders.py",
    "_parser_and_commands.py",
    "_repair_commands.py",
    "_closeout_commands.py",
    "_scaffold.py",
    "_promote_split.py",
    "_finish.py",
)

for _chunk in _CHUNKS:
    _path = Path(__file__).with_name(_chunk)
    exec(compile(_path.read_text(encoding="utf-8"), str(_path), "exec"), globals())

del _CHUNKS, _chunk, _path
