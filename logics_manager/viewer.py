from __future__ import annotations

from pathlib import Path

_PARTS = (
    "_model_and_parse.py",
    "_items_projects.py",
    "_files_env_commands.py",
    "_git_status.py",
    "_workspace.py",
    "_ci.py",
    "_release_cdx_status.py",
    "_cdx_missions.py",
    "_cdx_payloads.py",
    "_request_creation.py",
    "_server.py",
    "_request_handler_1.py",
    "_request_handler_2.py",
    "_request_handler_3.py",
    "_startup_display.py",
    "_cli.py",
)

_source_root = Path(__file__).with_name("viewer_parts")
_source = "".join((_source_root / part).read_text(encoding="utf-8") for part in _PARTS)
exec(compile(_source, __file__, "exec"), globals())

del _PARTS, _source_root, _source
