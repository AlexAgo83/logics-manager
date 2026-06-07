from __future__ import annotations

import json
from typing import Callable


def render_payload(payload: dict[str, object], output_format: str, text: str | Callable[[], str] | None = None) -> str:
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)
    if callable(text):
        return text()
    return text or ""


def print_payload(payload: dict[str, object], output_format: str, text: str | Callable[[], str] | None = None) -> None:
    output = render_payload(payload, output_format, text)
    if output:
        print(output)
