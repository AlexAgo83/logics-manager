"""Shared helper for tests that spawn a real `logics-manager` subprocess and
need to read its stdout for a line matching some condition, with a real
deadline.

A plain `while time.monotonic() < deadline: line = process.stdout.readline()`
loop does not enforce that deadline: `readline()` is a blocking call with no
OS-level timeout, so if the subprocess never prints and never closes its
pipe, the loop never gets to re-check the deadline at all - the blocked
`readline()` call itself never returns. Observed for real on a Windows
machine (a hang with no timeout ever firing, in two independent test files
that had each written this same loop shape). Reading on a daemon thread and
joining with a real timeout enforces the deadline regardless of what the
subprocess does.
"""

from __future__ import annotations

import queue
import subprocess
import threading
import time
from typing import Callable


def read_subprocess_line(process: subprocess.Popen[str], predicate: Callable[[str], bool], *, timeout: float = 30.0) -> str | None:
    """Return the first line from `process.stdout` for which `predicate(line)`
    is true, or `None` if the timeout elapses or the process closes its
    stdout first without a match.
    """
    assert process.stdout is not None
    lines: queue.Queue[str | None] = queue.Queue()

    def _pump() -> None:
        try:
            for line in process.stdout:
                lines.put(line)
        finally:
            lines.put(None)

    reader = threading.Thread(target=_pump, daemon=True)
    reader.start()

    deadline = time.monotonic() + timeout
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return None
        try:
            line = lines.get(timeout=remaining)
        except queue.Empty:
            return None
        if line is None:
            return None
        if predicate(line):
            return line
