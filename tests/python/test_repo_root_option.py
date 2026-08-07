"""`--repo-root` must target a repository from anywhere, on every command.

An embedder driving several repositories used to spawn each invocation with a
changed working directory, because only the `mcp` subcommands accepted an
explicit root. That also forced repository paths into remote shell command
strings, which breaks on paths containing spaces.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def _run(args: list[str], cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "logics_manager", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=120,
        env={"PYTHONPATH": str(REPO_ROOT), "PATH": "/usr/bin:/bin:/usr/sbin:/sbin"},
    )


@pytest.fixture
def corpus(tmp_path: Path) -> Path:
    """A real corpus at a path containing a space."""
    target = tmp_path / "repo with spaces"
    target.mkdir()
    result = _run(["bootstrap", "--repo-root", str(target)], cwd=tmp_path)
    assert result.returncode == 0, result.stderr
    return target


@pytest.mark.parametrize(
    "args",
    [
        ["status"],
        ["health", "--format", "json"],
        ["lint"],
        ["index"],
        ["flow", "list"],
        ["sync", "list-docs", "--format", "json"],
        ["doctor", "--format", "json"],
    ],
)
def test_command_targets_an_explicit_root_from_outside(args: list[str], corpus: Path, tmp_path: Path) -> None:
    """The working directory is outside any corpus; only --repo-root locates it."""
    result = _run([*args, "--repo-root", str(corpus)], cwd=tmp_path)
    assert "Could not locate repo root" not in (result.stdout + result.stderr)


def test_equals_form_is_accepted(corpus: Path, tmp_path: Path) -> None:
    result = _run([f"--repo-root={corpus}", "status"], cwd=tmp_path)
    assert result.returncode == 0, result.stderr
    assert "Could not locate repo root" not in result.stderr


def test_option_position_does_not_matter(corpus: Path, tmp_path: Path) -> None:
    before = _run(["--repo-root", str(corpus), "status"], cwd=tmp_path)
    after = _run(["status", "--repo-root", str(corpus)], cwd=tmp_path)
    assert before.returncode == 0 and after.returncode == 0
    assert before.stdout == after.stdout


def test_writes_land_in_the_targeted_repository(corpus: Path, tmp_path: Path) -> None:
    result = _run(
        ["flow", "new", "request", "--repo-root", str(corpus), "--title", "Targeted write"],
        cwd=tmp_path,
    )
    assert result.returncode == 0, result.stderr
    written = list((corpus / "logics" / "request").glob("*.md"))
    assert written, "no request written into the targeted repository"
    assert not (tmp_path / "logics").exists(), "wrote into the working directory instead"


def test_missing_path_is_rejected(tmp_path: Path) -> None:
    result = _run(["status", "--repo-root", str(tmp_path / "absent")], cwd=tmp_path)
    assert result.returncode != 0
    assert "does not exist" in result.stderr


def test_directory_without_a_corpus_is_rejected(tmp_path: Path) -> None:
    result = _run(["status", "--repo-root", str(tmp_path)], cwd=tmp_path)
    assert result.returncode != 0
    assert "no 'logics/' directory" in result.stderr


def test_bootstrap_accepts_a_directory_with_no_corpus_yet(tmp_path: Path) -> None:
    """bootstrap is what creates logics/, so it is the one exemption."""
    target = tmp_path / "fresh"
    target.mkdir()
    result = _run(["bootstrap", "--repo-root", str(target)], cwd=tmp_path)
    assert result.returncode == 0, result.stderr
    assert (target / "logics").is_dir()


def test_missing_value_is_rejected(tmp_path: Path) -> None:
    result = _run(["status", "--repo-root"], cwd=tmp_path)
    assert result.returncode != 0
    assert "requires a path" in result.stderr


def test_absent_option_still_discovers_from_the_working_directory() -> None:
    result = _run(["status", "--format", "json"], cwd=REPO_ROOT)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)


def test_mcp_call_honours_the_root(corpus: Path, tmp_path: Path) -> None:
    result = _run(
        ["mcp", "call", "get_logics_status", "--arguments", "{}", "--repo-root", str(corpus)],
        cwd=tmp_path,
    )
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)
