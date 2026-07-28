from __future__ import annotations

import json
import subprocess
from pathlib import Path

from logics_manager.cdx_memory import cdx_memory_payload, clean_cdx_memory_text


def test_clean_cdx_memory_removes_spinner_noise() -> None:
    raw = "Useful command\n" + ("• W o r k i n g " * 80) + "\nFinal summary\n"

    cleaned, warnings, ratio = clean_cdx_memory_text(raw)

    assert "Useful command" in cleaned
    assert "Final summary" in cleaned
    assert "W o r k i n g" not in cleaned
    assert "high-noise-memory" in warnings
    assert ratio > 0


def test_cdx_memory_payload_handles_ready_and_unavailable(tmp_path: Path) -> None:
    def runner(*_args, **_kwargs):
        return subprocess.CompletedProcess(
            ["cdx"],
            0,
            stdout=json.dumps(
                {
                    "ok": True,
                    "warnings": [],
                    "memory": {
                        "scope": "current",
                        "path": "/tmp/context.md",
                        "exists": True,
                        "bytes": 17,
                        "content": "Useful handoff text",
                    },
                }
            ),
            stderr="",
        )

    ready = cdx_memory_payload(tmp_path, runner=runner, which=lambda _name: "/usr/bin/cdx")
    missing = cdx_memory_payload(tmp_path, which=lambda _name: None)

    assert ready["state"] == "ready"
    assert ready["cleaned_excerpt"] == "Useful handoff text"
    assert missing["state"] == "unavailable"
