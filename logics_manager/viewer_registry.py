"""req_322: one live viewer per repo root, across every process that might start one.

Before this, the CLI viewer, each VS Code window's `ViewerServerManager`, and
a manual `logics-manager view` from a terminal were three independent,
uncoordinated lifecycles - none of them detected whether an equivalent
process was already serving a given repo. Two VS Code windows on the same
repo spawned two independent servers, each on its own OS-assigned port.

This is the shared, cross-process fix: a small per-repo registry, consulted
before binding. Claiming a repo root's slot is atomic (`fcntl.flock`, the
same exclusive-lock primitive already used in release.py for its own
evidence file) so two processes starting within the same instant for the
same repo root cannot both spawn and silently overwrite each other's entry -
the second one to acquire the lock finds the first's now-live entry and
reuses it instead.

Deliberately out of scope (see req_322's product brief non-goals): applying
this same registry to MCP's HTTP server, whose exposed-tool profile varies
per invocation, so multiple concurrent instances for one repo stay legitimate
there; and any active scan-and-kill of orphaned processes - discoverability
through this registry is the fix, not termination.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

try:
    import fcntl
except ImportError:  # pragma: no cover - platform fallback (Windows)
    fcntl = None  # type: ignore[assignment]

try:
    import msvcrt
except ImportError:  # pragma: no cover - platform fallback (POSIX)
    msvcrt = None  # type: ignore[assignment]

# msvcrt.locking() locks a byte-region starting at the file's current
# position, not the whole file - the exact size doesn't matter, only that
# the same region is locked and unlocked. Verified on a real Windows
# machine that a bare `fcntl is None` no-op (the prior behavior) lets two
# concurrent claims for the same repo both bind: bind_count came back 2,
# not 1, in test_concurrent_claims_for_the_same_repo_only_one_binds.
_LOCK_REGION_BYTES = 1
_STARTUP_GRACE_SECONDS = 2.0


def _lock_exclusive(handle: Any) -> None:
    if fcntl is not None:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
    elif msvcrt is not None:
        handle.seek(0)
        msvcrt.locking(handle.fileno(), msvcrt.LK_LOCK, _LOCK_REGION_BYTES)


def _unlock(handle: Any) -> None:
    if fcntl is not None:
        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
    elif msvcrt is not None:
        handle.seek(0)
        msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, _LOCK_REGION_BYTES)


def _registry_path() -> Path:
    # ponytail: env override exists only so a subprocess-based test (two real
    # CLI invocations, genuinely different processes) doesn't share state with
    # the machine's real registry or with other tests running concurrently.
    override = os.environ.get("LOGICS_VIEWER_REGISTRY_PATH")
    if override:
        return Path(override)
    return Path.home() / ".cache" / "logics-manager" / "viewers.json"


def _probe(url: str, *, timeout: float) -> bool | None:
    try:
        with urlopen(url, timeout=timeout) as response:
            return response.status == 200
    except HTTPError as exc:
        if exc.code == 404:
            return None
        return False
    except (OSError, URLError, ValueError):
        return False


def _is_alive(host: str, port: object, scheme: str, *, timeout: float = 1.0) -> bool:
    if not isinstance(port, int):
        return False
    base_url = f"{scheme}://{host}:{port}"
    fast_probe = _probe(f"{base_url}/api/live", timeout=timeout)
    if fast_probe is not None:
        return fast_probe
    return bool(_probe(f"{base_url}/api/status", timeout=timeout))


def _is_recently_claimed(existing: dict[str, Any]) -> bool:
    claimed_at = existing.get("claimed_at")
    return isinstance(claimed_at, (int, float)) and time.time() - claimed_at < _STARTUP_GRACE_SECONDS


def _is_alive_or_starting(host: str, existing: dict[str, Any]) -> bool:
    if _is_alive(host, existing.get("port"), str(existing.get("scheme", "http"))):
        return True
    deadline = time.time() + _STARTUP_GRACE_SECONDS
    while _is_recently_claimed(existing) and time.time() < deadline:
        time.sleep(0.05)
        if _is_alive(host, existing.get("port"), str(existing.get("scheme", "http")), timeout=0.2):
            return True
    return False


@dataclass(frozen=True)
class RegistryClaim:
    reused: bool
    port: int
    scheme: str
    server: Any | None  # the freshly bound server, or None when reused


@dataclass(frozen=True)
class RunningViewer:
    scheme: str
    host: str
    port: int


#: item_830: a probe against a dead port on loopback fails almost instantly (connection
#: refused, not a timeout); this bounds the rare case -- something answering but not
#: replying -- without making every MCP response or CLI print wait on it.
RUNNING_VIEWER_PROBE_TIMEOUT_SECONDS = 0.3


def running_viewer(repo_root: Path, *, host: str = "127.0.0.1") -> RunningViewer | None:
    """Is a viewer running for `repo_root`, and at what address -- nothing else.

    item_830: four surfaces (MCP, CLI, the bundled skills, instructions.md) are about to
    need this same answer. Built per surface, they drift, the way req_365 found the
    loading threshold had. This does not start or claim a viewer -- that is
    `claim_or_reuse` -- and it does not wait for one that is only starting: a passive
    reader either finds a live address or returns nothing, on this call, bounded.
    """
    try:
        raw = _registry_path().read_text(encoding="utf-8")
    except OSError:
        return None
    try:
        registry = json.loads(raw)
    except json.JSONDecodeError:
        return None
    existing = registry.get(str(Path(repo_root).resolve())) if isinstance(registry, dict) else None
    if not isinstance(existing, dict):
        return None
    port = existing.get("port")
    if not isinstance(port, int):
        return None
    scheme = str(existing.get("scheme", "http"))
    if not _is_alive(host, port, scheme, timeout=RUNNING_VIEWER_PROBE_TIMEOUT_SECONDS):
        return None
    return RunningViewer(scheme=scheme, host=host, port=port)


def register_fleet_project(repo_root: Path) -> None:
    """Record a CLI-selected project for the fleet server; browsers cannot add paths."""
    path = _registry_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text("{}", encoding="utf-8")
    with path.open("r+", encoding="utf-8") as handle:
        _lock_exclusive(handle)
        try:
            try:
                registry = json.loads(handle.read().strip() or "{}")
            except json.JSONDecodeError:
                registry = {}
            entry = registry.setdefault("fleet", {})
            projects = entry.get("projects") if isinstance(entry.get("projects"), list) else []
            project = str(Path(repo_root).resolve())
            entry["projects"] = list(dict.fromkeys([*projects, project]))
            handle.seek(0)
            handle.truncate()
            handle.write(json.dumps(registry))
            handle.flush()
        finally:
            _unlock(handle)


def fleet_projects() -> list[Path]:
    try:
        entry = json.loads(_registry_path().read_text(encoding="utf-8")).get("fleet", {})
        projects = entry.get("projects", []) if isinstance(entry, dict) else []
        return [Path(str(project)).resolve() for project in projects if Path(str(project)).is_dir()]
    except (OSError, ValueError):
        return []


def claim_or_reuse(repo_root: Path, host: str, *, bind: Callable[[], Any], key: str | None = None) -> RegistryClaim:
    """Reuse a live viewer for `repo_root` if one is already registered and
    answers a liveness probe; otherwise call `bind()` - while holding the
    cross-process lock - and register the server it returns.

    `bind` must return an object with `.server_address` (host, port) and
    `.url_scheme` attributes, matching `LogicsViewerServer`.
    """
    path = _registry_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text("{}", encoding="utf-8")
    key = key or str(Path(repo_root).resolve())

    with path.open("r+", encoding="utf-8") as handle:
        _lock_exclusive(handle)
        try:
            raw = handle.read().strip()
            try:
                registry: dict[str, Any] = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                registry = {}

            existing = registry.get(key)
            if isinstance(existing, dict) and _is_alive_or_starting(host, existing):
                return RegistryClaim(reused=True, port=int(existing["port"]), scheme=str(existing.get("scheme", "http")), server=None)

            server = bind()
            _, port = server.server_address[:2]
            scheme = server.url_scheme
            registry[key] = {
                "port": int(port), "scheme": scheme, "claimed_at": time.time(),
                "projects": existing.get("projects", []) if isinstance(existing, dict) else [],
            }
            handle.seek(0)
            handle.truncate()
            handle.write(json.dumps(registry))
            handle.flush()
            return RegistryClaim(reused=False, port=int(port), scheme=scheme, server=server)
        finally:
            _unlock(handle)
