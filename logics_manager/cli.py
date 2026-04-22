from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from textwrap import dedent

from .audit import audit_payload, build_parser as build_audit_parser
from .audit import render_audit
from .config import ConfigError, find_repo_root, render_config_show
from .index import index_payload, render_index
from .lint import lint_payload, render_lint
from .doctor import render_doctor


REPO_ROOT = Path(__file__).resolve().parents[1]

ROUTES = {
    "bootstrap": REPO_ROOT / "logics" / "skills" / "logics-bootstrapper" / "scripts" / "logics_bootstrap.py",
    "flow": REPO_ROOT / "logics" / "skills" / "logics-flow-manager" / "scripts" / "logics_flow.py",
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
    if args.command == "flow" and rest[:1] == ["new"]:
        from .flow import main as flow_main

        return flow_main(rest)
    if args.command == "audit":
        audit_parser = build_audit_parser()
        parsed, _unknown = audit_parser.parse_known_args(rest)
        repo_root = find_repo_root(Path.cwd())
        try:
            payload = audit_payload(
                repo_root,
                stale_days=parsed.stale_days,
                skip_ac_traceability=parsed.skip_ac_traceability,
                skip_gates=parsed.skip_gates,
                legacy_cutoff_version=parsed.legacy_cutoff_version,
                group_by_doc=parsed.group_by_doc,
                autofix_ac_traceability=parsed.autofix_ac_traceability,
                paths=parsed.paths,
                refs=parsed.refs,
                since_version=parsed.since_version,
                token_hygiene=parsed.token_hygiene,
                autofix_structure=parsed.autofix_structure,
                governance_profile=parsed.governance_profile,
            )
            output = render_audit(
                repo_root,
                stale_days=parsed.stale_days,
                skip_ac_traceability=parsed.skip_ac_traceability,
                skip_gates=parsed.skip_gates,
                legacy_cutoff_version=parsed.legacy_cutoff_version,
                output_format=parsed.format,
                group_by_doc=parsed.group_by_doc,
                autofix_ac_traceability=parsed.autofix_ac_traceability,
                paths=parsed.paths,
                refs=parsed.refs,
                since_version=parsed.since_version,
                token_hygiene=parsed.token_hygiene,
                autofix_structure=parsed.autofix_structure,
                governance_profile=parsed.governance_profile,
            )
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        print(output)
        return 0 if payload["ok"] else 1
    if args.command == "index":
        parser = argparse.ArgumentParser(prog="logics-manager index", add_help=False)
        parser.add_argument("--out", default="logics/INDEX.md")
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed, _unknown = parser.parse_known_args(rest)
        repo_root = find_repo_root(Path.cwd())
        try:
            payload = index_payload(repo_root, out=parsed.out)
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        output = render_index(repo_root, out=parsed.out, output_format=parsed.format) if parsed.format == "json" else f"Wrote {payload['output_path']}"
        print(output)
        return 0 if payload["ok"] else 1
    if args.command == "lint":
        parser = argparse.ArgumentParser(prog="logics-manager lint", add_help=False)
        parser.add_argument("--require-status", action="store_true")
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed, _unknown = parser.parse_known_args(rest)
        repo_root = find_repo_root(Path.cwd())
        try:
            payload = lint_payload(repo_root, require_status=parsed.require_status)
            output = render_lint(repo_root, require_status=parsed.require_status, output_format=parsed.format)
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        print(output)
        return 0 if payload["ok"] else 1
    return _run(ROUTES[args.command], rest)
