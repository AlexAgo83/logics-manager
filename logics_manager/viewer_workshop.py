"""Workshop runtime for the Logics viewer server.

Extracted from ``viewer.py`` to isolate the Workshop command-runner and
PTY-terminal runtime, plus the command-discovery payload builder. All public
names are re-exported from ``logics_manager.viewer`` for backward
compatibility (e.g. ``from logics_manager.viewer import
WorkshopTerminalRegistry``).
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tomllib
from datetime import datetime
from pathlib import Path
from typing import Any

WORKSHOP_COMMAND_MAX = 200


def _workshop_command_id(group: str, name: str) -> str:
    safe = re.sub(r"[^a-z0-9._-]+", "-", f"{group}:{name}".lower()).strip("-") or "command"
    return safe[:80]


def _discover_package_json_scripts(repo_root: Path) -> list[dict[str, Any]]:
    target = repo_root / "package.json"
    if not target.is_file():
        return []
    try:
        with target.open("rb") as handle:
            payload = json.load(handle)
    except (OSError, ValueError):
        return []
    scripts = payload.get("scripts") if isinstance(payload, dict) else None
    if not isinstance(scripts, dict):
        return []
    entries: list[dict[str, Any]] = []
    for name, command in scripts.items():
        if not isinstance(name, str) or not isinstance(command, str):
            continue
        entries.append(
            {
                "id": _workshop_command_id("npm", name),
                "source": "package.json",
                "group": "npm scripts",
                "name": name,
                "command": command,
                "runner": ["npm", "run", name],
            }
        )
        if len(entries) >= WORKSHOP_COMMAND_MAX:
            break
    return entries


def _discover_pyproject_scripts(repo_root: Path) -> list[dict[str, Any]]:
    target = repo_root / "pyproject.toml"
    if not target.is_file():
        return []
    try:
        with target.open("rb") as handle:
            payload = tomllib.load(handle)
    except (OSError, tomllib.TOMLDecodeError):
        return []
    entries: list[dict[str, Any]] = []
    project_scripts = (payload.get("project") or {}).get("scripts")
    if isinstance(project_scripts, dict):
        for name, target_ref in project_scripts.items():
            if not isinstance(name, str) or not isinstance(target_ref, str):
                continue
            entries.append(
                {
                    "id": _workshop_command_id("pyproject", name),
                    "source": "pyproject.toml [project.scripts]",
                    "group": "Project scripts",
                    "name": name,
                    "command": target_ref,
                    "runner": [name],
                }
            )
            if len(entries) >= WORKSHOP_COMMAND_MAX:
                return entries
    poetry_scripts = (
        ((payload.get("tool") or {}).get("poetry") or {}).get("scripts")
        if isinstance(payload.get("tool"), dict)
        else None
    )
    if isinstance(poetry_scripts, dict):
        for name, target_ref in poetry_scripts.items():
            if not isinstance(name, str) or not isinstance(target_ref, str):
                continue
            entries.append(
                {
                    "id": _workshop_command_id("poetry", name),
                    "source": "pyproject.toml [tool.poetry.scripts]",
                    "group": "Poetry scripts",
                    "name": name,
                    "command": target_ref,
                    "runner": ["poetry", "run", name],
                }
            )
            if len(entries) >= WORKSHOP_COMMAND_MAX:
                break
    return entries


def workshop_commands_payload(repo_root: Path) -> dict[str, Any]:
    if not repo_root.is_dir():
        return {"state": "unavailable", "commands": [], "message": "Workspace root is unavailable."}
    commands: list[dict[str, Any]] = []
    commands.extend(_discover_package_json_scripts(repo_root))
    commands.extend(_discover_pyproject_scripts(repo_root))
    seen: set[str] = set()
    deduped: list[dict[str, Any]] = []
    for entry in commands:
        if entry["id"] in seen:
            continue
        seen.add(entry["id"])
        deduped.append(entry)
    return {
        "state": "ok" if deduped else "empty",
        "commands": deduped,
        "message": "" if deduped else "No package.json or pyproject.toml entry points were found in the workspace root.",
    }


_WORKSHOP_SESSION_BUFFER_MAX = 4000
_WORKSHOP_SESSION_TTL_SECONDS = 600


class WorkshopCommandSession:
    """Sandboxed subprocess for a Workshop command run.

    Captures merged stdout+stderr into a ring buffer that SSE consumers can
    tail incrementally via a monotonically increasing sequence number. Stop
    delivers SIGTERM (Unix) or CTRL_BREAK_EVENT (Windows) to the process
    group and falls back to SIGKILL if the process refuses to exit.
    """

    def __init__(self, session_id: str, command_id: str, runner: list[str], cwd: Path):
        import collections
        import threading
        self.session_id = session_id
        self.command_id = command_id
        self.runner = list(runner)
        self.cwd = cwd
        self.started_at = ""
        self.finished_at = ""
        self.exit_code: int | None = None
        self.state = "starting"
        self.error: str = ""
        self._buffer: collections.deque[tuple[int, str]] = collections.deque(maxlen=_WORKSHOP_SESSION_BUFFER_MAX)
        self._seq = 0
        self._lock = threading.Lock()
        self._proc: subprocess.Popen[bytes] | None = None
        self._reader: threading.Thread | None = None
        self._waiter: threading.Thread | None = None
        self._created_at = self._now()
        self._last_activity = self._created_at

    @staticmethod
    def _now() -> float:
        import time
        return time.monotonic()

    @staticmethod
    def _iso_now() -> str:
        return datetime.utcnow().isoformat(timespec="seconds") + "Z"

    def append_line(self, channel: str, text: str) -> None:
        with self._lock:
            self._seq += 1
            self._buffer.append((self._seq, f"{channel}\t{text}"))
            self._last_activity = self._now()

    def tail(self, since_seq: int) -> tuple[int, list[tuple[int, str]]]:
        with self._lock:
            snapshot = [(seq, line) for (seq, line) in self._buffer if seq > since_seq]
            return self._seq, snapshot

    def status_payload(self) -> dict[str, Any]:
        with self._lock:
            return {
                "id": self.session_id,
                "commandId": self.command_id,
                "runner": list(self.runner),
                "state": self.state,
                "exitCode": self.exit_code,
                "startedAt": self.started_at,
                "finishedAt": self.finished_at,
                "lastSeq": self._seq,
                "error": self.error,
            }

    def is_expired(self, ttl_seconds: float = _WORKSHOP_SESSION_TTL_SECONDS) -> bool:
        if self.state in {"running", "starting"}:
            return False
        return (self._now() - self._last_activity) > ttl_seconds

    def start(self) -> None:
        import threading
        creation_flags = 0
        popen_kwargs: dict[str, Any] = {
            "cwd": str(self.cwd),
            "stdout": subprocess.PIPE,
            "stderr": subprocess.STDOUT,
            "stdin": subprocess.DEVNULL,
        }
        if sys.platform == "win32":
            creation_flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
            popen_kwargs["creationflags"] = creation_flags
        else:
            popen_kwargs["start_new_session"] = True
        try:
            self._proc = subprocess.Popen(self.runner, **popen_kwargs)
        except (OSError, ValueError) as exc:
            self.state = "error"
            self.error = f"Unable to start command: {exc}"
            self.finished_at = self._iso_now()
            return
        self.started_at = self._iso_now()
        self.state = "running"
        self._reader = threading.Thread(target=self._read_loop, name=f"workshop-reader-{self.session_id}", daemon=True)
        self._reader.start()
        self._waiter = threading.Thread(target=self._wait_loop, name=f"workshop-waiter-{self.session_id}", daemon=True)
        self._waiter.start()

    def _read_loop(self) -> None:
        proc = self._proc
        if proc is None or proc.stdout is None:
            return
        try:
            for raw in iter(proc.stdout.readline, b""):
                try:
                    text = raw.decode("utf-8", errors="replace").rstrip("\r\n")
                except Exception:
                    continue
                self.append_line("stdout", text)
        except (OSError, ValueError):
            pass

    def _wait_loop(self) -> None:
        proc = self._proc
        if proc is None:
            return
        try:
            code = proc.wait()
        except Exception as exc:
            self.error = f"Wait failed: {exc}"
            code = -1
        with self._lock:
            self.exit_code = code
            self.finished_at = self._iso_now()
            self.state = "finished" if code == 0 else ("stopped" if code in (-15, 143, -9, 137) else "failed")
            self._last_activity = self._now()

    def stop(self, *, timeout: float = 5.0) -> None:
        proc = self._proc
        if proc is None or proc.poll() is not None:
            return
        try:
            if sys.platform == "win32":
                sig = getattr(__import__("signal"), "CTRL_BREAK_EVENT", None)
                if sig is not None:
                    proc.send_signal(sig)
                else:
                    proc.terminate()
            else:
                import os as _os
                import signal as _signal
                try:
                    _os.killpg(proc.pid, _signal.SIGTERM)
                except (OSError, ProcessLookupError):
                    proc.terminate()
        except Exception:
            proc.terminate()
        try:
            proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            try:
                if sys.platform == "win32":
                    proc.kill()
                else:
                    import os as _os
                    import signal as _signal
                    _os.killpg(proc.pid, _signal.SIGKILL)
            except Exception:
                proc.kill()


class WorkshopSessionRegistry:
    def __init__(self) -> None:
        import threading
        self._sessions: dict[str, WorkshopCommandSession] = {}
        self._lock = threading.Lock()
        self._counter = 0

    def create(self, command_entry: dict[str, Any], repo_root: Path) -> WorkshopCommandSession:
        runner = command_entry.get("runner")
        if not isinstance(runner, list) or not runner or not all(isinstance(part, str) and part for part in runner):
            raise ValueError("Command entry is missing a valid runner.")
        if not repo_root.is_dir():
            raise ValueError("Workspace root is unavailable.")
        with self._lock:
            self._counter += 1
            session_id = f"ws-{self._counter:06d}"
        session = WorkshopCommandSession(
            session_id=session_id,
            command_id=str(command_entry.get("id") or ""),
            runner=runner,
            cwd=repo_root,
        )
        with self._lock:
            self._prune_locked()
            self._sessions[session_id] = session
        session.start()
        return session

    def get(self, session_id: str) -> WorkshopCommandSession | None:
        with self._lock:
            return self._sessions.get(session_id)

    def list(self) -> list[dict[str, Any]]:
        with self._lock:
            self._prune_locked()
            return [session.status_payload() for session in self._sessions.values()]

    def _prune_locked(self) -> None:
        for sid in list(self._sessions.keys()):
            if self._sessions[sid].is_expired():
                del self._sessions[sid]

    def shutdown(self) -> None:
        with self._lock:
            sessions = list(self._sessions.values())
        for session in sessions:
            session.stop(timeout=1.0)


_WORKSHOP_TERMINAL_BUFFER_MAX = 8000
_WORKSHOP_TERMINAL_TTL_SECONDS = 1800


def workshop_terminals_available() -> bool:
    """True when the host can spawn PTY sessions through the stdlib backend."""
    if sys.platform == "win32":
        return False
    try:
        import pty  # noqa: F401
        import termios  # noqa: F401
    except ImportError:
        return False
    return True


def _default_workshop_shell() -> list[str]:
    candidate = os.environ.get("SHELL") or ""
    if candidate and os.access(candidate, os.X_OK):
        return [candidate, "-i"]
    for fallback in ("/bin/zsh", "/bin/bash", "/bin/sh"):
        if os.access(fallback, os.X_OK):
            return [fallback, "-i"]
    return ["/bin/sh"]


def _derive_cdx_session_name(command: list[str]) -> str:
    """Best-effort CDX session name for a terminal command, computed server-side.

    Mirrors the client heuristic but uses the launch command (authoritative)
    rather than re-parsing the rendered label, so a terminal's CDX typing is
    carried on its own payload and never depends on a separately-fetched status
    payload (which is null right after a refresh, causing the typing to drop).
    Mission terminals are addressed by mission id, not a CDX session, so they
    return no session name.
    """
    if len(command) < 2 or command[0].strip().lower() != "cdx":
        return ""
    verb = command[1].strip().lower()
    if verb == "mission":
        return ""
    positional = [token for token in command[2:] if token and not token.startswith("-")]
    if not positional:
        return ""
    # `cdx handoff <source> <destination>` runs the destination session.
    if verb == "handoff":
        return positional[-1]
    return positional[0]


class WorkshopTerminalSession:
    """Interactive PTY-backed terminal session using stdlib `pty`.

    Reads from the master fd in a daemon thread, buffers output bytes
    (decoded utf-8 with replace) into a ring; writes from the client land
    on the master fd directly. Resize uses TIOCSWINSZ ioctl. Stop sends
    SIGTERM to the session leader and falls back to SIGKILL after a grace
    window. Unix-only: Windows callers must check
    workshop_terminals_available() before instantiating.
    """

    def __init__(self, session_id: str, command: list[str], cwd: Path, *, label: str = ""):
        import collections
        import threading
        self.session_id = session_id
        self.command = list(command)
        self.cwd = cwd
        self.label = label or (command[0] if command else "shell")
        self.cdx_session = _derive_cdx_session_name(self.command)
        self.started_at = ""
        self.finished_at = ""
        self.exit_code: int | None = None
        self.state = "starting"
        self.error: str = ""
        self._buffer: collections.deque[tuple[int, str]] = collections.deque(maxlen=_WORKSHOP_TERMINAL_BUFFER_MAX)
        self._seq = 0
        self._lock = threading.Lock()
        self._master_fd: int | None = None
        self._pid: int | None = None
        self._reader: threading.Thread | None = None
        self._reaper: threading.Thread | None = None
        self._created_at = self._now()
        self._last_activity = self._created_at

    @staticmethod
    def _now() -> float:
        import time
        return time.monotonic()

    @staticmethod
    def _iso_now() -> str:
        return datetime.utcnow().isoformat(timespec="seconds") + "Z"

    def _append(self, text: str) -> None:
        with self._lock:
            self._seq += 1
            self._buffer.append((self._seq, text))
            self._last_activity = self._now()

    def tail(self, since_seq: int) -> tuple[int, list[tuple[int, str]]]:
        with self._lock:
            snapshot = [(seq, chunk) for (seq, chunk) in self._buffer if seq > since_seq]
            return self._seq, snapshot

    def status_payload(self) -> dict[str, Any]:
        with self._lock:
            return {
                "id": self.session_id,
                "label": self.label,
                "cdxSession": self.cdx_session,
                "command": list(self.command),
                "state": self.state,
                "exitCode": self.exit_code,
                "startedAt": self.started_at,
                "finishedAt": self.finished_at,
                "lastSeq": self._seq,
                "error": self.error,
            }

    def is_expired(self, ttl_seconds: float = _WORKSHOP_TERMINAL_TTL_SECONDS) -> bool:
        if self.state in {"running", "starting"}:
            return False
        return (self._now() - self._last_activity) > ttl_seconds

    def start(self) -> None:
        import threading
        if not workshop_terminals_available():
            self.state = "error"
            self.error = "PTY backend is not available on this host."
            self.finished_at = self._iso_now()
            return
        import pty
        try:
            pid, master_fd = pty.fork()
        except (OSError, RuntimeError) as exc:
            self.state = "error"
            self.error = f"Unable to fork PTY: {exc}"
            self.finished_at = self._iso_now()
            return
        if pid == 0:
            try:
                os.chdir(str(self.cwd))
            except OSError:
                pass
            env = os.environ.copy()
            env.setdefault("TERM", "xterm-256color")
            env.setdefault("COLORTERM", "truecolor")
            try:
                os.execvpe(self.command[0], self.command, env)
            except Exception as exc:  # noqa: BLE001
                sys.stderr.write(f"Unable to exec {self.command[0]}: {exc}\n")
                os._exit(127)
        self._pid = pid
        self._master_fd = master_fd
        self.started_at = self._iso_now()
        self.state = "running"
        self._reader = threading.Thread(target=self._read_loop, name=f"workshop-pty-reader-{self.session_id}", daemon=True)
        self._reader.start()
        self._reaper = threading.Thread(target=self._reap_loop, name=f"workshop-pty-reaper-{self.session_id}", daemon=True)
        self._reaper.start()

    def write(self, data: str) -> None:
        if not data or self._master_fd is None:
            return
        try:
            os.write(self._master_fd, data.encode("utf-8"))
        except OSError as exc:
            self.error = f"Write failed: {exc}"

    def resize(self, rows: int, cols: int) -> None:
        if self._master_fd is None or rows <= 0 or cols <= 0:
            return
        try:
            import fcntl
            import struct
            import termios
            fcntl.ioctl(self._master_fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
        except (OSError, ImportError):
            return

    def _read_loop(self) -> None:
        fd = self._master_fd
        if fd is None:
            return
        try:
            while True:
                try:
                    chunk = os.read(fd, 4096)
                except OSError:
                    break
                if not chunk:
                    break
                try:
                    text = chunk.decode("utf-8", errors="replace")
                except Exception:  # noqa: BLE001
                    continue
                self._append(text)
        finally:
            try:
                os.close(fd)
            except OSError:
                pass

    def _reap_loop(self) -> None:
        pid = self._pid
        if pid is None:
            return
        try:
            _, status = os.waitpid(pid, 0)
        except OSError as exc:
            self.error = f"waitpid failed: {exc}"
            status = -1
        if isinstance(status, int):
            if os.WIFEXITED(status):
                code = os.WEXITSTATUS(status)
            elif os.WIFSIGNALED(status):
                code = -os.WTERMSIG(status)
            else:
                code = -1
        else:
            code = -1
        with self._lock:
            self.exit_code = code
            self.finished_at = self._iso_now()
            self.state = "finished" if code == 0 else ("stopped" if code in (-15, -9) else "failed")
            self._last_activity = self._now()

    def stop(self, *, timeout: float = 3.0) -> None:
        pid = self._pid
        if pid is None:
            return
        import signal as _signal
        import time as _time
        try:
            os.killpg(os.getpgid(pid), _signal.SIGTERM)
        except (OSError, ProcessLookupError):
            try:
                os.kill(pid, _signal.SIGTERM)
            except OSError:
                return
        deadline = _time.monotonic() + timeout
        while _time.monotonic() < deadline:
            with self._lock:
                if self.state in {"finished", "failed", "stopped"}:
                    return
            _time.sleep(0.05)
        try:
            os.killpg(os.getpgid(pid), _signal.SIGKILL)
        except (OSError, ProcessLookupError):
            try:
                os.kill(pid, _signal.SIGKILL)
            except OSError:
                return


class WorkshopTerminalRegistry:
    def __init__(self) -> None:
        import threading
        self._sessions: dict[str, WorkshopTerminalSession] = {}
        self._lock = threading.Lock()
        self._counter = 0

    def create(self, command: list[str], cwd: Path, *, label: str = "") -> WorkshopTerminalSession:
        if not workshop_terminals_available():
            raise ValueError("PTY backend is not available on this host.")
        if not command or not isinstance(command, list):
            raise ValueError("Terminal command must be a non-empty list.")
        if not cwd.is_dir():
            raise ValueError("Workspace root is unavailable.")
        with self._lock:
            self._counter += 1
            session_id = f"wt-{self._counter:06d}"
        session = WorkshopTerminalSession(session_id=session_id, command=command, cwd=cwd, label=label)
        with self._lock:
            self._prune_locked()
            self._sessions[session_id] = session
        session.start()
        return session

    def get(self, session_id: str) -> WorkshopTerminalSession | None:
        with self._lock:
            return self._sessions.get(session_id)

    def list(self) -> list[dict[str, Any]]:
        with self._lock:
            self._prune_locked()
            return [session.status_payload() for session in self._sessions.values()]

    def _prune_locked(self) -> None:
        for sid in list(self._sessions.keys()):
            if self._sessions[sid].is_expired():
                del self._sessions[sid]

    def shutdown(self) -> None:
        with self._lock:
            sessions = list(self._sessions.values())
        for session in sessions:
            session.stop(timeout=1.0)


def workshop_terminal_default_command() -> list[str]:
    return _default_workshop_shell()
