from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any


MAX_EXCERPT_CHARS = 4000
ANSI_PATTERN = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
SPACED_WORKING_PATTERN = re.compile(r"(?:\b[Ww]\s+o\s+r\s+k\s+i\s+n\s+g\b|\bWorking\b)")


def clean_cdx_memory_text(text: str) -> tuple[str, list[str], float]:
    warnings: list[str] = []
    without_ansi = ANSI_PATTERN.sub("", text)
    kept: list[str] = []
    removed_chars = len(text) - len(without_ansi)
    for line in without_ansi.splitlines():
        stripped = line.strip()
        if not stripped:
            kept.append("")
            continue
        working_hits = len(SPACED_WORKING_PATTERN.findall(stripped))
        if len(stripped) > 500 and (working_hits >= 2 or "────" in stripped):
            removed_chars += len(line)
            continue
        if stripped in {"/usage", "ctrl + t to view transcript"}:
            removed_chars += len(line)
            continue
        kept.append(line.rstrip())
    cleaned = "\n".join(kept).strip()
    original_len = max(len(text), 1)
    noise_ratio = round(min(1.0, removed_chars / original_len), 3)
    if noise_ratio >= 0.25:
        warnings.append("high-noise-memory")
    if not cleaned:
        warnings.append("empty-cleaned-memory")
    return cleaned, warnings, noise_ratio


def _cdx_command(scope: str, repo_root: Path) -> list[str]:
    if scope == "global":
        return ["cdx", "memory", "--global", "show", "--json"]
    if scope == "current":
        return ["cdx", "memory", "show", "--json"]
    if scope == "project":
        return ["cdx", "memory", "--project", str(repo_root), "show", "--json"]
    raise ValueError(f"Unsupported CDX memory scope `{scope}`.")


def _excerpt(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "\n[truncated]"


def cdx_memory_payload(
    repo_root: Path,
    *,
    scope: str = "current",
    max_chars: int = MAX_EXCERPT_CHARS,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    which_func = which or shutil.which
    if which_func("cdx") is None:
        return {
            "ok": False,
            "state": "unavailable",
            "scope": scope,
            "warnings": ["cdx-not-found"],
            "message": "`cdx` is not available on PATH.",
        }
    run = runner or subprocess.run
    command = _cdx_command(scope, repo_root)
    try:
        result = run(command, cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False, timeout=10)
    except subprocess.TimeoutExpired:
        return {"ok": False, "state": "timeout", "scope": scope, "warnings": ["cdx-memory-timeout"], "message": "`cdx memory` timed out."}
    except OSError as exc:
        return {"ok": False, "state": "unavailable", "scope": scope, "warnings": ["cdx-memory-error"], "message": str(exc)}
    if result.returncode != 0:
        return {
            "ok": False,
            "state": "unavailable",
            "scope": scope,
            "warnings": ["cdx-memory-unavailable"],
            "message": (result.stderr or result.stdout).strip(),
        }
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"ok": False, "state": "invalid-json", "scope": scope, "warnings": ["cdx-memory-invalid-json"], "message": "Unsupported `cdx memory` JSON output."}
    memory = payload.get("memory") if isinstance(payload, dict) else None
    if not isinstance(memory, dict):
        return {"ok": False, "state": "invalid-json", "scope": scope, "warnings": ["cdx-memory-invalid-json"], "message": "Missing memory object."}
    raw = memory.get("content") if isinstance(memory.get("content"), str) else ""
    cleaned, cleanup_warnings, noise_ratio = clean_cdx_memory_text(raw)
    source_path = memory.get("path") if isinstance(memory.get("path"), str) else ""
    bytes_before = int(memory.get("bytes") or len(raw.encode("utf-8")))
    bytes_after = len(cleaned.encode("utf-8"))
    warnings = [*(payload.get("warnings") if isinstance(payload.get("warnings"), list) else []), *cleanup_warnings]
    state = "empty" if not raw else ("noisy" if "high-noise-memory" in warnings else "ready")
    return {
        "ok": state in {"ready", "noisy"},
        "state": state,
        "scope": memory.get("scope") or scope,
        "source_path": source_path,
        "exists": bool(memory.get("exists", bool(raw))),
        "detected_repo": str(repo_root),
        "bytes_before": bytes_before,
        "bytes_after": bytes_after,
        "noise_ratio": noise_ratio,
        "warnings": warnings,
        "raw_excerpt": _excerpt(raw, max_chars),
        "cleaned_excerpt": _excerpt(cleaned, max_chars),
        "latest_useful_handoff": _excerpt(cleaned, min(max_chars, 1200)),
    }
