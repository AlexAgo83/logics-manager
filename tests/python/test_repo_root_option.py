"""`--repo-root` must target a repository from anywhere, on every command.

An embedder driving several repositories used to spawn each invocation with a
changed working directory, because only the `mcp` subcommands accepted an
explicit root. That also forced repository paths into remote shell command
strings, which breaks on paths containing spaces.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def _sanitized_subprocess_env() -> dict[str, str]:
    """A minimal env proving `--repo-root` doesn't rely on `cwd` - but still
    a real one. The POSIX PATH this used to hardcode unconditionally left
    Windows with no way to resolve `Path.home()` at all: `skills.py` reads it
    at import time, and Windows has no `pwd`-module fallback the way POSIX
    does, so `logics_manager` itself failed to import there with
    `RuntimeError: Could not determine home directory` - confirmed for real
    on a GitHub Actions windows-latest runner.
    """
    if sys.platform == "win32":
        env = {"PYTHONPATH": str(REPO_ROOT), "SystemRoot": os.environ.get("SystemRoot", r"C:\Windows")}
        for key in ("PATH", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "APPDATA", "LOCALAPPDATA"):
            if key in os.environ:
                env[key] = os.environ[key]
        return env
    return {"PYTHONPATH": str(REPO_ROOT), "PATH": "/usr/bin:/bin:/usr/sbin:/sbin"}


def _run(args: list[str], cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "logics_manager", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=120,
        env=_sanitized_subprocess_env(),
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


def test_root_help_after_the_option_is_help_not_an_unknown_command(corpus: Path, tmp_path: Path) -> None:
    result = _run(["--repo-root", str(corpus), "--help"], cwd=tmp_path)
    assert result.returncode == 0, result.stderr
    assert "Usage:" in result.stdout
    assert "Subcommands: status, health, roadmap, brief" in result.stdout


@pytest.mark.parametrize("linked_worktree", [False, True], ids=["checkout", "worktree"])
def test_discovery_uses_nearest_git_entry(linked_worktree: bool, tmp_path: Path) -> None:
    parent_cache = tmp_path / "logics" / ".cache"
    parent_cache.mkdir(parents=True)
    preferences = parent_cache / "viewer-preferences.json"
    preferences.write_text("{}\n", encoding="utf-8")
    checkout = tmp_path / "checkout"
    subprocess.run(["git", "init", str(checkout)], check=True, capture_output=True, env=_sanitized_subprocess_env())
    root = checkout
    if linked_worktree:
        subprocess.run(
            ["git", "-C", str(checkout), "-c", "user.name=Test", "-c", "user.email=test@example.com",
             "-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", "Initial fixture"],
            check=True, capture_output=True, env=_sanitized_subprocess_env(),
        )
        root = tmp_path / "worktree"
        subprocess.run(["git", "-C", str(checkout), "worktree", "add", "-b", "fixture", str(root)], check=True, capture_output=True, env=_sanitized_subprocess_env())
        assert (root / ".git").is_file()
    nested = root / "src" / "nested"
    # Even a corpus-shaped subdirectory cannot move the Git boundary.
    (nested / "logics").mkdir(parents=True)
    for _ in range(2):
        result = _run(["bootstrap", "--format", "json"], cwd=nested)
        assert result.returncode == 0, result.stderr
        assert Path(json.loads(result.stdout)["repo_root"]) == root.resolve()
    for relative in ("AGENTS.md", "LOGICS.md", "logics/instructions.md", "logics/request", "logics/tasks"):
        assert (root / relative).exists()
        assert not (tmp_path / relative).exists()
        assert not (nested / relative).exists()
    assert sorted(path.relative_to(tmp_path / "logics").as_posix() for path in (tmp_path / "logics").rglob("*")) == [
        ".cache", ".cache/viewer-preferences.json",
    ]
    assert preferences.read_text(encoding="utf-8") == "{}\n"
    # Flow and config delegate to the same resolver used by bootstrap.
    result = _run(["flow", "new", "request", "--title", "Discovered root"], cwd=nested)
    assert result.returncode == 0, result.stderr
    assert list((root / "logics" / "request").glob("*.md"))
    (root / "logics.yaml").write_text("version: 42\n", encoding="utf-8")
    result = _run(["config", "show", "--format", "json"], cwd=nested)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["config"]["version"] == 42


@pytest.mark.parametrize("args", [["bootstrap"], ["bootstrap", "--check"], ["status"], ["flow", "list"], ["sync", "list-docs"]])
def test_discovery_rejects_non_git_ancestors(args: list[str], tmp_path: Path) -> None:
    (tmp_path / "logics" / ".cache").mkdir(parents=True)
    nested = tmp_path / "outside" / "nested"
    nested.mkdir(parents=True)
    before = sorted(path.relative_to(tmp_path).as_posix() for path in tmp_path.rglob("*"))
    result = _run(args, cwd=nested)
    assert result.returncode != 0
    assert "--repo-root" in result.stderr
    assert sorted(path.relative_to(tmp_path).as_posix() for path in tmp_path.rglob("*")) == before


def test_explicit_dot_allows_bootstrap_outside_git(tmp_path: Path) -> None:
    (tmp_path / "logics" / ".cache").mkdir(parents=True)
    target = tmp_path / "outside" / "nested"
    target.mkdir(parents=True)
    result = _run(["bootstrap", "--repo-root", ".", "--format", "json"], cwd=target)
    assert result.returncode == 0, result.stderr
    assert Path(json.loads(result.stdout)["repo_root"]) == target.resolve()
    assert (target / "AGENTS.md").is_file()
    assert not (tmp_path / "AGENTS.md").exists()
