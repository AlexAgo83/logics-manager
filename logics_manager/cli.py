from __future__ import annotations

import argparse
from importlib import metadata
import subprocess
import sys
from shutil import which
from pathlib import Path
from textwrap import dedent

from .bootstrap import bootstrap_payload, render_bootstrap
from .assist import main as assist_main
from .audit import audit_payload, build_parser as build_audit_parser
from .audit import render_audit
from .config import ConfigError, find_repo_root, render_config_show
from .index import index_payload, render_index
from .lint import lint_payload, render_lint
from .doctor import render_doctor


DEFAULT_SELF_UPDATE_PY_PACKAGE = "logics-manager"
DEFAULT_SELF_UPDATE_PACKAGE = "@grifhinz/logics-manager"


def get_cli_version() -> str:
    version_file = Path(__file__).resolve().parents[1] / "VERSION"
    try:
        version = version_file.read_text(encoding="utf-8").strip()
    except OSError:
        version = ""
    if version:
        return version

    try:
        return metadata.version("logics-manager")
    except metadata.PackageNotFoundError:
        pass
    return "0.0.0"


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv[1:]
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
    parser.add_argument("--version", action="version", version=f"logics-manager {get_cli_version()}")
    parser.add_argument(
        "command",
        nargs="?",
        choices=("bootstrap", "flow", "sync", "assist", "audit", "index", "lint", "config", "doctor", "self-update"),
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
    if args.command == "bootstrap":
        parser = argparse.ArgumentParser(prog="logics-manager bootstrap", add_help=False)
        parser.add_argument("--check", action="store_true")
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed, _unknown = parser.parse_known_args(rest)
        try:
            repo_root = find_repo_root(Path.cwd())
        except ConfigError:
            repo_root = Path.cwd().resolve()
        payload = bootstrap_payload(repo_root, check=parsed.check)
        print(render_bootstrap(payload, output_format=parsed.format))
        return 0 if payload["ok"] else 1
    if args.command == "self-update":
        parser = argparse.ArgumentParser(prog="logics-manager self-update", add_help=False)
        parser.add_argument("--manager", choices=("auto", "pip", "npm"), default="auto")
        parser.add_argument("--package", default=DEFAULT_SELF_UPDATE_PACKAGE)
        parser.add_argument("--python-package", default=DEFAULT_SELF_UPDATE_PY_PACKAGE)
        parser.add_argument("--dry-run", action="store_true")
        parsed, _unknown = parser.parse_known_args(rest)

        manager = parsed.manager
        if manager == "auto":
            try:
                metadata.version(parsed.python_package)
            except metadata.PackageNotFoundError:
                manager = "npm" if which("npm") else "pip"
            else:
                manager = "pip"

        if manager == "pip":
            command = [sys.executable, "-m", "pip", "install", "--upgrade", parsed.python_package]
        else:
            npm = which("npm")
            if not npm:
                print("npm was not found on PATH. Install Node.js/npm or update the package manually.")
                return 1
            command = [npm, "install", "-g", f"{parsed.package}@latest"]

        if parsed.dry_run:
            print("Dry run: " + " ".join(command))
            return 0

        result = subprocess.run(command, check=False)
        if result.returncode == 0:
            target = parsed.python_package if manager == "pip" else parsed.package
            print(f"Updated {target} via {manager}.")
        return result.returncode
    if args.command == "flow" and rest[:1] in (["new"], ["companion"], ["promote"], ["split"], ["close"], ["finish"]):
        from .flow import main as flow_main

        return flow_main(rest)
    if args.command == "sync":
        if rest[:1] not in (["close-eligible-requests"], ["refresh-mermaid-signatures"], ["schema-status"], ["context-pack"], ["export-graph"]):
            raise SystemExit("Unsupported sync subcommand for the native CLI slice.")
        from .sync import main as sync_main

        return sync_main(rest)
    if args.command == "assist":
        if rest[:1] not in (["runtime-status"], ["diff-risk"], ["commit-plan"], ["changed-surface-summary"], ["doc-consistency"], ["review-checklist"], ["validation-checklist"], ["validation-summary"], ["test-impact-summary"], ["roi-report"], ["next-step"], ["claude-bridges"], ["claude-instructions"], ["request-draft"], ["spec-first-pass"], ["backlog-groom"], ["closure-summary"], ["context"]):
            raise SystemExit("Unsupported assist subcommand for the native CLI slice.")
        return assist_main(rest)
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
    raise SystemExit(f"Unsupported command: {args.command}")
