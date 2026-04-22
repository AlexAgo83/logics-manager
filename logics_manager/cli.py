from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from textwrap import dedent

from .config import ConfigError, find_repo_root, render_config_show
from .doctor import render_doctor


REPO_ROOT = Path(__file__).resolve().parents[1]

ROUTES = {
    "bootstrap": REPO_ROOT / "logics" / "skills" / "logics-bootstrapper" / "scripts" / "logics_bootstrap.py",
    "flow": REPO_ROOT / "logics" / "skills" / "logics-flow-manager" / "scripts" / "logics_flow.py",
    "audit": REPO_ROOT / "logics" / "skills" / "logics-flow-manager" / "scripts" / "workflow_audit.py",
    "index": REPO_ROOT / "logics" / "skills" / "logics-indexer" / "scripts" / "generate_index.py",
    "lint": REPO_ROOT / "logics" / "skills" / "logics-doc-linter" / "scripts" / "logics_lint.py",
}


def _run(script: Path, argv: list[str]) -> int:
    completed = subprocess.run([sys.executable, str(script), *argv], check=False)
    return completed.returncode


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        prog="logics-manager",
        description="Canonical Logics CLI for workflow, validation, and runtime operations.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=dedent(
            """
            Examples:
              logics-manager flow new request --title "My request"
              logics-manager audit
              logics-manager config show --format json
            """
        ).strip(),
    )
    parser.add_argument("--version", action="version", version="logics-manager 0.0.0")
    parser.add_argument(
        "command",
        nargs="?",
        choices=("bootstrap", "flow", "audit", "index", "lint", "config", "doctor"),
    )
    parser.add_argument("rest", nargs=argparse.REMAINDER)
    args = parser.parse_args(argv[:1])

    if args.command is None:
        parser.print_help()
        return 1

    rest = argv[1:]
    if args.command == "config":
        if not rest or rest[0] != "show":
            raise SystemExit("Usage: logics-manager config show [args...]")
        config_args = rest[1:]
        parser = argparse.ArgumentParser(prog="logics-manager config show", add_help=False)
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed, _unknown = parser.parse_known_args(config_args)
        repo_root = find_repo_root(Path.cwd())
        try:
            output = render_config_show(repo_root, output_format=parsed.format)
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        print(output)
        return 0
    if args.command == "doctor":
        doctor_args = rest
        parser = argparse.ArgumentParser(prog="logics-manager doctor", add_help=False)
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed, _unknown = parser.parse_known_args(doctor_args)
        repo_root = find_repo_root(Path.cwd())
        try:
            output = render_doctor(repo_root, output_format=parsed.format)
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        print(output)
        return 0
    return _run(ROUTES[args.command], rest)
