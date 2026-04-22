#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


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
    )
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
        return _run(ROUTES["flow"], ["sync", "show-config", *rest[1:]])
    if args.command == "doctor":
        return _run(ROUTES["flow"], ["sync", "doctor", *rest])
    return _run(ROUTES[args.command], rest)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
