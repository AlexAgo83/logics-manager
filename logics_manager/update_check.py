from __future__ import annotations

from dataclasses import dataclass
import json
import os
from pathlib import Path
import time
from typing import Any, Callable
from urllib.error import URLError
from urllib.request import urlopen


NPM_LATEST_URL = "https://registry.npmjs.org/@grifhinz%2Flogics-manager/latest"
DISABLE_ENV = "LOGICS_MANAGER_NO_UPDATE_CHECK"
CHECK_INTERVAL_SECONDS = 24 * 60 * 60


@dataclass(frozen=True)
class UpdateInfo:
    current_version: str
    latest_version: str | None
    update_available: bool
    checked_at: int | None
    update_command: str
    source: str

    def to_payload(self) -> dict[str, Any]:
        return {
            "currentVersion": self.current_version,
            "latestVersion": self.latest_version,
            "updateAvailable": self.update_available,
            "checkedAt": self.checked_at,
            "updateCommand": self.update_command,
            "source": self.source,
        }


def _parse_version(value: str | None) -> tuple[int, int, int, str]:
    raw = (value or "").strip().lstrip("v")
    parts = raw.split(".", 3)
    numeric: list[int] = []
    suffix = ""
    for index, part in enumerate(parts[:3]):
        digits = ""
        rest = ""
        for char in part:
            if char.isdigit() and not rest:
                digits += char
            else:
                rest += char
        numeric.append(int(digits or "0"))
        if rest:
            suffix = ".".join([rest, *parts[index + 1 :]])
            break
    while len(numeric) < 3:
        numeric.append(0)
    return numeric[0], numeric[1], numeric[2], suffix


def is_newer_version(latest: str | None, current: str | None) -> bool:
    latest_tuple = _parse_version(latest)
    current_tuple = _parse_version(current)
    return latest_tuple[:3] > current_tuple[:3]


def update_cache_path() -> Path:
    override = os.environ.get("LOGICS_MANAGER_UPDATE_CACHE")
    if override:
        return Path(override)
    cache_root = os.environ.get("XDG_CACHE_HOME")
    if cache_root:
        return Path(cache_root) / "logics-manager" / "update-check.json"
    return Path.home() / ".cache" / "logics-manager" / "update-check.json"


def _read_cache(path: Path, now: int) -> dict[str, Any] | None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    checked_at = int(payload.get("checked_at") or 0)
    if checked_at <= 0 or now - checked_at > CHECK_INTERVAL_SECONDS:
        return None
    return payload if isinstance(payload, dict) else None


def _write_cache(path: Path, payload: dict[str, Any]) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, sort_keys=True), encoding="utf-8")
    except OSError:
        return


def fetch_latest_npm_version(*, timeout: float = 0.75, opener: Callable[..., Any] = urlopen) -> str | None:
    try:
        with opener(NPM_LATEST_URL, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (OSError, URLError, TimeoutError, json.JSONDecodeError, ValueError):
        return None
    version = payload.get("version") if isinstance(payload, dict) else None
    return version.strip() if isinstance(version, str) and version.strip() else None


def get_update_info(
    current_version: str,
    *,
    cache_path: Path | None = None,
    now: int | None = None,
    fetch_latest: Callable[[], str | None] | None = None,
) -> UpdateInfo:
    now_value = int(time.time() if now is None else now)
    path = cache_path or update_cache_path()
    cached = _read_cache(path, now_value)
    latest = str(cached.get("latest_version") or "") if cached else ""
    if not latest:
        latest = (fetch_latest or fetch_latest_npm_version)() or ""
        _write_cache(path, {"checked_at": now_value, "latest_version": latest})
    return UpdateInfo(
        current_version=current_version,
        latest_version=latest or None,
        update_available=is_newer_version(latest, current_version),
        checked_at=now_value,
        update_command="logics-manager self-update",
        source="npm",
    )


def get_update_notice(current_version: str) -> str | None:
    if os.environ.get(DISABLE_ENV):
        return None
    info = get_update_info(current_version)
    if not info.update_available or not info.latest_version:
        return None
    return (
        f"logics-manager {info.latest_version} is available "
        f"(current {info.current_version}). Run `{info.update_command}` to update."
    )
