"""The documented risk of network writes must match the real capability.

`POST /api/workshop-terminal-start` runs the command supplied in the request
body, so a paired device can run commands under the operator's account. The
guarding mechanism is sound, but both the option's help and SECURITY.md used to
call that "write access" and "mutate state" -- which an operator reads as
document edits when deciding whether to expose the viewer.

These tests pin the wording so it cannot be dropped silently.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_the_option_help_states_command_execution() -> None:
    result = subprocess.run(
        [sys.executable, "-m", "logics_manager", "view", "--help"],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=60,
    )
    assert result.returncode == 0, result.stderr
    help_text = " ".join(result.stdout.split())
    assert "--lan-rw" in help_text
    assert "running commands" in help_text, "the help no longer states the capability"
    assert "under your account" in help_text


def test_the_security_document_describes_the_capability() -> None:
    text = (REPO_ROOT / "SECURITY.md").read_text(encoding="utf-8")
    assert "run commands under the account" in text, (
        "SECURITY.md no longer says a paired device can run commands"
    )
    assert "workshop-terminal-start" in text, "the endpoint is not named"
    assert "Nothing sandboxes the command" in text, "the absence of a sandbox is no longer stated"


def test_the_endpoint_is_still_gated() -> None:
    """The wording change must not have relaxed anything."""
    from logics_manager.viewer import VIEWER_MUTATING_ROUTES

    assert "/api/workshop-terminal-start" in VIEWER_MUTATING_ROUTES
