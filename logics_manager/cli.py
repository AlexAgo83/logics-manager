from __future__ import annotations

import argparse
from importlib import metadata
import subprocess
import sys
from shutil import which
from pathlib import Path

from .bootstrap import bootstrap_payload, render_bootstrap
from .assist import main as assist_main
from .audit import audit_payload, build_parser as build_audit_parser
from .audit import render_audit
from .cli_output import render_payload
from .config import ConfigError, find_repo_root, render_config_show
from .index import index_payload, render_index
from .insights import followups_payload, health_payload, render_followups, render_health, render_status, status_payload
from .insights import product_consistency_payload, render_product_consistency
from .lint import lint_payload, render_lint
from .sync import search_logics_docs_payload
from .doctor import render_doctor
from .termstyle import colorize_help


DEFAULT_SELF_UPDATE_PY_PACKAGE = "logics-manager"
DEFAULT_SELF_UPDATE_PACKAGE = "@grifhinz/logics-manager"
HELP_ARGV = (["-h"], ["--help"])
ROOT_COMMANDS = (
    "bootstrap",
    "flow",
    "sync",
    "assist",
    "audit",
    "index",
    "health",
    "followups",
    "product-consistency",
    "status",
    "lint",
    "config",
    "doctor",
    "mcp",
    "self-update",
    "search",
)


def _expand_json_alias(argv: list[str]) -> list[str]:
    expanded: list[str] = []
    for arg in argv:
        if arg == "--json":
            expanded.extend(["--format", "json"])
        else:
            expanded.append(arg)
    return expanded


def _build_root_help() -> str:
    sections = [
        "Logics Manager CLI",
        "Canonical CLI for Logics workflow, validation, MCP, and runtime ops.",
        "",
        "Usage:",
        "  logics-manager <command> [args...]",
        "  logics-manager <command> --help",
        "",
        "Top-level options:",
        "  -h, --help      Show this help message and exit.",
        "  -v, --version   Print the installed version and exit.",
        "",
        "Common workflows:",
        '  logics-manager flow new request --title "My request"',
        "  logics-manager audit --group-by-doc",
        "  logics-manager status",
        "  logics-manager sync refresh-mermaid-signatures",
        "  logics-manager mcp tunnel --repo-root . --port 8765",
        "",
        "Workflow authoring:",
        "  flow       Create, promote, split, close, and finish workflow docs.",
        "             Subcommands: new, list, companion, promote, split, close, finish",
        "  sync       Maintain generated workflow state and doc metadata.",
        "             Subcommands: close-eligible-requests, refresh-mermaid-signatures,",
        "                          schema-status, read-doc, list-docs, search-docs,",
        "                          update-indicators, append-note, context-pack, export-graph",
        "  index      Generate logics/INDEX.md from the workflow corpus.",
        "  health     Show workflow health counts and issue signals.",
        "  followups  List follow-up areas with request creation commands.",
        "  product-consistency  Check product brief lineage links.",
        "  status     Summarize open workflow docs and next actions.",
        "  search     Search workflow docs directly.",
        "",
        "Validation:",
        "  lint       Check filenames, headings, indicators, and changed-doc hygiene.",
        "  audit      Check workflow consistency and traceability.",
        "             Use --governance-profile {relaxed,standard,strict}.",
        "             JSON output includes issue_count, warning_count, can_continue,",
        "             and release_ready for agent workflows.",
        "  doctor     Check required workflow directories and schema metadata.",
        "",
        "Agent and integration surfaces:",
        "  assist     Inspect runtime signals and build bounded context bundles.",
        "  mcp        Expose bounded Logics tools for MCP clients.",
        "             Subcommands: serve, serve-http, connect, tunnel, tools, call",
        "  config     Render merged runtime config. Example: config show --format json",
        "",
        "Maintenance:",
        "  bootstrap  Prepare or check the workflow tree and generated instructions.",
        "  self-update Update the installed Python or npm package.",
    ]
    return "\n".join(sections)


def _print_help(text: str) -> None:
    print(colorize_help(text))


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
    if not argv:
        _print_help(_build_root_help())
        return 1
    if argv[0] in ("-h", "--help"):
        _print_help(_build_root_help())
        return 0
    if argv[0] in {"-v", "--version"}:
        print(f"logics-manager {get_cli_version()}")
        return 0

    argv = _expand_json_alias(argv)
    command = argv[0]
    if command not in ROOT_COMMANDS:
        raise SystemExit(f"Unsupported command: {command}")

    rest = argv[1:]
    if command == "config":
        if not rest or rest[0] != "show":
            raise SystemExit("Usage: logics-manager config show [args...]")
        config_args = rest[1:]
        parser = argparse.ArgumentParser(prog="logics-manager config show", add_help=False)
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(config_args)
        repo_root = find_repo_root(Path.cwd())
        try:
            output = render_config_show(repo_root, output_format=parsed.format)
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        print(output)
        return 0
    if command == "doctor":
        doctor_args = rest
        parser = argparse.ArgumentParser(prog="logics-manager doctor", add_help=False)
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(doctor_args)
        repo_root = find_repo_root(Path.cwd())
        try:
            output = render_doctor(repo_root, output_format=parsed.format)
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        print(output)
        return 0
    if command == "bootstrap":
        parser = argparse.ArgumentParser(prog="logics-manager bootstrap", add_help=False)
        parser.add_argument("--check", action="store_true")
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(rest)
        try:
            repo_root = find_repo_root(Path.cwd())
        except ConfigError:
            repo_root = Path.cwd().resolve()
        payload = bootstrap_payload(repo_root, check=parsed.check)
        print(render_bootstrap(payload, output_format=parsed.format))
        return 0 if payload["ok"] else 1
    if command == "self-update":
        parser = argparse.ArgumentParser(prog="logics-manager self-update", add_help=False)
        parser.add_argument("--manager", choices=("auto", "pip", "npm"), default="auto")
        parser.add_argument("--package", default=DEFAULT_SELF_UPDATE_PACKAGE)
        parser.add_argument("--python-package", default=DEFAULT_SELF_UPDATE_PY_PACKAGE)
        parser.add_argument("--dry-run", action="store_true")
        parsed = parser.parse_args(rest)

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
    if command == "flow" and (rest[:1] in (["new"], ["list"], ["companion"], ["promote"], ["split"], ["close"], ["finish"]) or rest[:1] in HELP_ARGV):
        from .flow import main as flow_main

        return flow_main(rest)
    if command == "sync":
        if rest[:1] not in (["close-eligible-requests"], ["refresh-mermaid-signatures"], ["schema-status"], ["read-doc"], ["list-docs"], ["search-docs"], ["update-indicators"], ["append-note"], ["context-pack"], ["export-graph"]) and rest[:1] not in HELP_ARGV:
            raise SystemExit("Unsupported sync subcommand for the native CLI slice.")
        from .sync import main as sync_main

        return sync_main(rest)
    if command == "assist":
        if rest[:1] not in (["runtime-status"], ["diff-risk"], ["commit-plan"], ["changed-surface-summary"], ["doc-consistency"], ["review-checklist"], ["validation-checklist"], ["validation-summary"], ["test-impact-summary"], ["roi-report"], ["next-step"], ["claude-bridges"], ["claude-instructions"], ["request-draft"], ["spec-first-pass"], ["backlog-groom"], ["closure-summary"], ["context"]) and rest[:1] not in HELP_ARGV:
            raise SystemExit("Unsupported assist subcommand for the native CLI slice.")
        return assist_main(rest)
    if command == "mcp":
        from .mcp import main as mcp_main

        return mcp_main(rest)
    if command == "audit":
        audit_parser = build_audit_parser()
        parsed = audit_parser.parse_args(rest)
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
        return 0
    if command == "index":
        parser = argparse.ArgumentParser(prog="logics-manager index", add_help=False)
        parser.add_argument("--out", default="logics/INDEX.md")
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(rest)
        repo_root = find_repo_root(Path.cwd())
        try:
            payload = index_payload(repo_root, out=parsed.out)
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        output = render_payload(payload, parsed.format, f"Wrote {payload['output_path']}")
        print(output)
        return 0 if payload["ok"] else 1
    if command == "status":
        parser = argparse.ArgumentParser(prog="logics-manager status", add_help=False)
        parser.add_argument("--limit", type=int, default=10)
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(rest)
        repo_root = find_repo_root(Path.cwd())
        try:
            payload = status_payload(repo_root, limit=parsed.limit)
            output = render_status(repo_root, output_format=parsed.format, limit=parsed.limit)
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        print(output)
        return 0
    if command == "health":
        parser = argparse.ArgumentParser(prog="logics-manager health", add_help=False)
        parser.add_argument("--limit", type=int, default=10)
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(rest)
        repo_root = find_repo_root(Path.cwd())
        try:
            payload = health_payload(repo_root, limit=parsed.limit)
            output = render_health(repo_root, output_format=parsed.format, limit=parsed.limit)
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        print(output)
        return 0
    if command == "followups":
        parser = argparse.ArgumentParser(prog="logics-manager followups", add_help=False)
        parser.add_argument("--limit", type=int, default=50)
        parser.add_argument("--source-kind", choices=("all", "request", "backlog", "task", "product", "architecture"), default="all")
        parser.add_argument("--include-closed", action="store_true")
        parser.add_argument("--closed-only", action="store_true")
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(rest)
        if parsed.include_closed and parsed.closed_only:
            raise SystemExit("--include-closed and --closed-only are mutually exclusive.")
        repo_root = find_repo_root(Path.cwd())
        try:
            payload = followups_payload(
                repo_root,
                limit=parsed.limit,
                source_kind=parsed.source_kind,
                include_closed=parsed.include_closed,
                closed_only=parsed.closed_only,
            )
            output = render_followups(
                repo_root,
                output_format=parsed.format,
                limit=parsed.limit,
                source_kind=parsed.source_kind,
                include_closed=parsed.include_closed,
                closed_only=parsed.closed_only,
            )
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        print(output)
        return 0 if payload["ok"] else 1
    if command == "search":
        parser = argparse.ArgumentParser(prog="logics-manager search", add_help=False)
        parser.add_argument("query")
        parser.add_argument("--kind", choices=("all", "request", "backlog", "task"), default="all")
        parser.add_argument("--status")
        parser.add_argument("--limit", type=int, default=20)
        parser.add_argument("--max-snippet-chars", type=int, default=240)
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(rest)
        repo_root = find_repo_root(Path.cwd())
        payload = search_logics_docs_payload(
            repo_root,
            parsed.query,
            kind=parsed.kind,
            status=parsed.status,
            limit=parsed.limit,
            max_snippet_chars=parsed.max_snippet_chars,
        )
        if parsed.format == "json":
            output = render_payload(payload, "json")
        else:
            lines = [f"Search `{payload['query']}`: {payload['returned_count']} match(es)"]
            for match in payload["matches"]:
                lines.append(f"- {match['ref']}:{match['line']} {match['title']}")
            output = "\n".join(lines)
        print(output)
        return 0
    if command == "product-consistency":
        parser = argparse.ArgumentParser(prog="logics-manager product-consistency", add_help=False)
        parser.add_argument("--limit", type=int, default=50)
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(rest)
        repo_root = find_repo_root(Path.cwd())
        payload = product_consistency_payload(repo_root, limit=parsed.limit)
        print(render_product_consistency(repo_root, output_format=parsed.format, limit=parsed.limit))
        return 0
    if command == "lint":
        parser = argparse.ArgumentParser(prog="logics-manager lint", add_help=False)
        parser.add_argument("--require-status", action="store_true")
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(rest)
        repo_root = find_repo_root(Path.cwd())
        try:
            payload = lint_payload(repo_root, require_status=parsed.require_status)
            output = render_lint(repo_root, require_status=parsed.require_status, output_format=parsed.format)
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        print(output)
        return 0 if payload["ok"] else 1
    raise SystemExit(f"Unsupported command: {command}")
