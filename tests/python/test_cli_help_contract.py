"""Every command must answer `--help` with usage and a zero exit.

`LOGICS.md`, the generated bridge shipped into every consuming repository,
points operators and agents at per-command help as the authoritative command
contract. Eleven top-level commands used to answer it with a usage error
instead, and an earlier fix repaired one release subcommand rather than the
shared construction point, so the rest stayed broken and unnoticed.

The command list is derived from the CLI's own registration, never from a
literal list here: a hand-maintained list in this file would drift exactly the
way the surface drifted.
"""

from __future__ import annotations

import argparse
import importlib
import subprocess
import sys

import pytest

from logics_manager.help_flags import declared_flags, subparser_for

from logics_manager.cli import ROOT_COMMANDS


# Modules that expose their argparse parser; their subcommands are discovered
# from it. Commands whose help is hand-rendered (flow, release, i18n, mcp,
# skills, design, roadmap) are covered at top level and, where they register
# argparse subparsers, through _discover_subcommands below.
# ponytail: introspects only modules exposing build_parser(); a command that
# hand-rolls both its parser and its subcommand dispatch is covered at top
# level only. Expose build_parser() there if that stops being enough.
_PARSER_MODULES = (
    "assist",
    "audit",
    "index",
    "lint",
    "obsidian",
    "sync",
    "viewer",
    "flow",
)


def _run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "logics_manager", *args],
        capture_output=True,
        text=True,
        timeout=60,
    )


def _discover_subcommands() -> list[list[str]]:
    """Walk the argparse subparsers each module registers, recursively."""
    discovered: list[list[str]] = []

    def walk(parser: argparse.ArgumentParser, prefix: list[str]) -> None:
        for action in parser._actions:  # noqa: SLF001 - argparse exposes no public accessor
            if not isinstance(action, argparse._SubParsersAction):  # noqa: SLF001
                continue
            for name, subparser in action.choices.items():
                discovered.append([*prefix, name])
                walk(subparser, [*prefix, name])

    for module_name in _PARSER_MODULES:
        module = importlib.import_module(f"logics_manager.{module_name}")
        build_parser = getattr(module, "build_parser", None)
        if build_parser is None:
            continue
        command = "view" if module_name == "viewer" else module_name
        walk(build_parser(), [command])
    return discovered


@pytest.mark.parametrize("command", ROOT_COMMANDS)
def test_top_level_command_answers_help(command: str) -> None:
    result = _run([command, "--help"])
    assert result.returncode == 0, (
        f"`logics-manager {command} --help` exited {result.returncode}.\n"
        f"stdout: {result.stdout[:400]}\nstderr: {result.stderr[:400]}"
    )
    assert result.stdout.strip(), f"`logics-manager {command} --help` printed nothing."


@pytest.mark.parametrize("command", ROOT_COMMANDS)
def test_top_level_command_answers_short_help(command: str) -> None:
    result = _run([command, "-h"])
    assert result.returncode == 0, (
        f"`logics-manager {command} -h` exited {result.returncode}.\n"
        f"stderr: {result.stderr[:400]}"
    )


@pytest.mark.parametrize("path", _discover_subcommands(), ids=lambda path: " ".join(path))
def test_subcommand_answers_help(path: list[str]) -> None:
    result = _run([*path, "--help"])
    assert result.returncode == 0, (
        f"`logics-manager {' '.join(path)} --help` exited {result.returncode}.\n"
        f"stdout: {result.stdout[:400]}\nstderr: {result.stderr[:400]}"
    )
    assert result.stdout.strip(), (
        f"`logics-manager {' '.join(path)} --help` printed nothing."
    )


def test_subcommand_discovery_is_not_empty() -> None:
    """A registration change that silently empties discovery would make every
    parametrized subcommand test vacuous."""
    assert len(_discover_subcommands()) > 20


def test_help_names_the_commands_own_flags() -> None:
    """Help must describe the command, not just repeat the root listing."""
    result = _run(["status", "--help"])
    assert "--limit" in result.stdout
    assert "--format" in result.stdout


@pytest.mark.parametrize("path", _discover_subcommands(), ids=lambda path: " ".join(path))
def test_help_lists_every_flag_the_command_declares(path: list[str]) -> None:
    """The screens used to restate their flags by hand, and nine had drifted out of them."""
    module_name = "viewer" if path[0] == "view" else path[0]
    module = importlib.import_module(f"logics_manager.{module_name}")
    parser = subparser_for(module.build_parser(), path[1:])

    printed = _run([*path, "--help"]).stdout
    missing = sorted(flag for flag in declared_flags(parser) if flag not in printed)

    assert not missing, f"`logics-manager {' '.join(path)} --help` never names {missing}"
