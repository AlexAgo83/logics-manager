from __future__ import annotations

from pathlib import Path

_PARTS = (
    "_01.py",
    "_02.py",
    "_03.py",
)

_source_root = Path(__file__).with_name("release_parts")
_source = "".join((_source_root / part).read_text(encoding="utf-8") for part in _PARTS)
exec(compile(_source, __file__, "exec"), globals())

del _PARTS, _source_root, _source
