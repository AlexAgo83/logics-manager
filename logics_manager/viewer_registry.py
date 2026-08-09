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
from urllib.error import URLError
from urllib.request import urlopen

try:
    import fcntl
except ImportError:  # pragma: no cover - platform fallback (e.g. Windows)
    fcntl = None  # type: ignore[assignment]


def _registry_path() -> Path:
    # ponytail: env override exists only so a subprocess-based test (two real
    # CLI invocations, genuinely different processes) doesn't share state with
    # the machine's real registry or with other tests running concurrently.
    override = os.environ.get("LOGICS_VIEWER_REGISTRY_PATH")
    if override:
        return Path(override)
    return Path.home() / ".cache" / "logics-manager" / "viewers.json"


def _is_alive(host: str, port: object, scheme: str, *, timeout: float = 1.0) -> bool:
    if not isinstance(port, int):
        return False
    try:
        with urlopen(f"{scheme}://{host}:{port}/api/status", timeout=timeout) as response:
            return response.status == 200
    except (OSError, URLError, ValueError):
        return False


@dataclass(frozen=True)
class RegistryClaim:
    reused: bool
    port: int
    scheme: str
    server: Any | None  # the freshly bound server, or None when reused


def claim_or_reuse(repo_root: Path, host: str, *, bind: Callable[[], Any]) -> RegistryClaim:
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
    key = str(Path(repo_root).resolve())

    with path.open("r+", encoding="utf-8") as handle:
        if fcntl is not None:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        try:
            raw = handle.read().strip()
            try:
                registry: dict[str, Any] = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                registry = {}

            existing = registry.get(key)
            if isinstance(existing, dict) and _is_alive(host, existing.get("port"), str(existing.get("scheme", "http"))):
                return RegistryClaim(reused=True, port=int(existing["port"]), scheme=str(existing.get("scheme", "http")), server=None)

            server = bind()
            _, port = server.server_address[:2]
            scheme = server.url_scheme
            registry[key] = {"port": int(port), "scheme": scheme, "claimed_at": time.time()}
            handle.seek(0)
            handle.truncate()
            handle.write(json.dumps(registry))
            handle.flush()
            return RegistryClaim(reused=False, port=int(port), scheme=scheme, server=server)
        finally:
            if fcntl is not None:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
