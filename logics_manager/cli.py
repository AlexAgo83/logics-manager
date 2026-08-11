from __future__ import annotations

import argparse
import json
import os
import re
from importlib import metadata
import subprocess
import sys
import sysconfig
from shutil import which
from pathlib import Path

from .bootstrap import bootstrap_payload, render_bootstrap
from .assist import main as assist_main
from .audit import audit_payload, build_parser as build_audit_parser
from .audit import render_audit
from .cli_output import render_payload
from .runtime_drift import drift_message
from .config import ConfigError, find_repo_root, render_config_show, set_repo_root_override
from .index import index_payload, render_index
from .insights import followups_payload, health_payload, render_followups, render_health, render_status, status_payload
from .insights import product_consistency_payload, render_product_consistency
from .lint import commit_indicator_findings, lint_payload, render_lint
from .sync import search_logics_docs_payload
from .doctor import doctor_packaging_payload, doctor_payload, render_doctor, render_doctor_payload
from .termstyle import colorize_help
from .skills import resync_all_harnesses
from .update_check import current_version as package_current_version, get_update_info, get_update_notice


DEFAULT_SELF_UPDATE_PY_PACKAGE = "logics-manager"
DEFAULT_SELF_UPDATE_PACKAGE = "@grifhinz/logics-manager"
#: Commands whose output is a statement about the corpus. These are the ones where a
#: stale runtime silently changes the answer, so these are the ones that warn.
#: `view`, `config`, `mcp` and friends are excluded: they serve rather than report.
CORPUS_REPORTING_COMMANDS = frozenset({"audit", "lint", "doctor", "health", "status", "followups", "product-consistency", "index", "flow", "sync", "release"})

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
    "view",
    "config",
    "doctor",
    "roadmap",
    "design",
    "release",
    "i18n",
    "obsidian",
    "mcp",
    "skills",
    "self-update",
    "update",
    "search",
    "fleet",
)


def _extract_repo_root(argv: list[str]) -> tuple[list[str], str | None]:
    """Pull `--repo-root PATH` (or `--repo-root=PATH`) out of any position.

    Handled before dispatch rather than per command: every command reaches its
    repository through `find_repo_root`, so one extraction plus one override
    covers the whole surface.
    """
    remaining: list[str] = []
    value: str | None = None
    index = 0
    while index < len(argv):
        arg = argv[index]
        if arg == "--repo-root":
            if index + 1 >= len(argv):
                raise SystemExit("--repo-root requires a path argument.")
            value = argv[index + 1]
            index += 2
            continue
        if arg.startswith("--repo-root="):
            value = arg.split("=", 1)[1]
            index += 1
            continue
        remaining.append(arg)
        index += 1
    return remaining, value


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
        "  --repo-root DIR Target this repository instead of discovering one from the",
        "                  current directory. Accepted by every command.",
        "",
        "Common workflows:",
        '  logics-manager flow new request --title "My request"',
        '  logics-manager flow roadmap propose --title "Project roadmap" --milestone "0.1: MVP"',
        "  logics-manager audit --group-by-doc",
        "  logics-manager status",
        "  logics-manager flow show req_001_example",
        "  logics-manager sync context-pack req_001_example task_001_example --format json",
        "  logics-manager sync refresh-mermaid-signatures task_001_example",
        "  logics-manager mcp tunnel --repo-root . --port 8765",
        "",
        "Workflow authoring:",
        "  flow       Create, promote, split, close, and finish workflow docs.",
        "             Subcommands: new, list, show, companion, roadmap, deliver, scaffold, validate, validate-closeout, repair, closeout, promote, split, close, finish",
        "  sync       Maintain generated workflow state and doc metadata.",
        "             Subcommands: close-eligible-requests, refresh-mermaid-signatures,",
        "                          schema-status, read-doc, list-docs, search-docs,",
        "                          update-indicators, append-note, context-pack, export-graph",
        "  index      Generate logics/INDEX.md from the workflow corpus.",
        "  health     Show workflow health counts and issue signals.",
        "  followups  List follow-up areas with request creation commands.",
        "  product-consistency  Check product brief lineage links.",
        "  status     Summarize open workflow docs and next actions.",
        "  fleet      Report status or health across every corpus under a root directory.",
        "             Subcommands: fleet status, fleet health [--root DIR].",
        "  search     Search workflow docs directly.",
        "  roadmap   Inspect and place open workflow refs in roadmap files.",
        "  design    Generate asset prompt packs for external AI image tools.",
        "  view       Start a local read-only browser viewer for the Logics corpus.",
        "             Subcommand: view diagnostics [--limit N] [--format text|json].",
        "",
        "Validation:",
        "  lint       Check filenames, headings, indicators, and changed-doc hygiene.",
        "  audit      Check workflow consistency and traceability.",
        "             Use --governance-profile {relaxed,standard,strict}.",
        "             JSON output includes issue_count, warning_count, can_continue,",
        "             and release_ready for agent workflows.",
        "  doctor     Check required workflow directories and schema metadata.",
        "  release    Plan, inspect, and validate project-owned release workflow state.",
        "  i18n       Initialize, inspect, lint, and validate optional project translation catalogs.",
        "  obsidian   Sync, check, or clean the opt-in Obsidian frontmatter projection.",
        "",
        "Agent and integration surfaces:",
        "  assist     Inspect runtime signals and build bounded context bundles.",
        "  mcp        Expose bounded Logics tools for MCP clients.",
        "             Subcommands: serve, serve-http, connect, tunnel, tools, call",
        "  config     Render merged runtime config. Example: config show --format json",
        "  skills     List or install bundled agent skills (e.g. /corpus) into ~/.claude/skills.",
        "             Subcommands: list, install [names...] [--all-profiles] [--target-dir DIR] [--force]",
        "",
        "Maintenance:",
        "  bootstrap  Prepare or check the workflow tree and generated instructions.",
        "  update      Update the installed Python or npm package.",
        "  self-update Alias-compatible legacy name for update.",
    ]
    return "\n".join(sections)


def _print_help(text: str) -> None:
    print(colorize_help(text))


def command_parser(prog: str) -> argparse.ArgumentParser:
    """Build a parser for one command.

    Every hand-built command parser must go through here: `argparse` only
    registers `--help` when `add_help` stays on its default, and commands that
    turned it off answered their own help flag with a usage error instead. The
    generated `LOGICS.md` bridge points operators and agents at per-command
    help as the current command contract, so that has to hold everywhere.
    """
    return argparse.ArgumentParser(prog=prog)


def get_cli_version() -> str:
    return package_current_version()


def _is_running_inside_venv() -> bool:
    return sys.prefix != getattr(sys, "base_prefix", sys.prefix)


def _is_externally_managed_python() -> bool:
    if _is_running_inside_venv():
        return False
    stdlib = sysconfig.get_path("stdlib")
    return bool(stdlib and (Path(stdlib) / "EXTERNALLY-MANAGED").exists())


def _is_running_from_pipx(package_name: str = DEFAULT_SELF_UPDATE_PY_PACKAGE) -> bool:
    expected = package_name.replace("_", "-").lower()
    candidates = [Path(sys.prefix), Path(sys.executable)]
    for candidate in candidates:
        parts = [part.lower() for part in candidate.parts]
        for index, part in enumerate(parts[:-2]):
            if part == "pipx" and parts[index + 1] == "venvs" and parts[index + 2] == expected:
                return True
    return False


def _is_running_from_npm_package() -> bool:
    package_json = Path(__file__).resolve().parents[1] / "package.json"
    try:
        payload = json.loads(package_json.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    return payload.get("name") == DEFAULT_SELF_UPDATE_PACKAGE


def latest_available_version() -> str | None:
    """Published version, or None when the registry is unreachable."""
    return get_update_info(get_cli_version()).latest_version


def _print_skill_sync_summary(skill_sync: dict[str, object]) -> None:
    targets = skill_sync.get("targets") if isinstance(skill_sync, dict) else None
    if not targets:
        return
    refreshed = [name for result in targets for name in result.get("refreshed", [])]
    installed = [name for result in targets for name in result.get("installed", [])]
    hand_modified = [name for result in targets for name in result.get("hand_modified", [])]
    if not (refreshed or installed or hand_modified):
        return
    print("Skills re-synced across detected harnesses:")
    if installed:
        print(f"  added: {', '.join(sorted(set(installed)))}")
    if refreshed:
        print(f"  refreshed: {', '.join(sorted(set(refreshed)))}")
    if hand_modified:
        print(f"  left alone (hand-modified): {', '.join(sorted(set(hand_modified)))}")


def _print_update_state(state: dict[str, object], output_format: str) -> None:
    if output_format == "json":
        print(json.dumps(state, indent=2, sort_keys=True, default=str))
        return
    if state.get("message"):
        print(state["message"])
        return
    lines = [
        f"logics-manager {state.get('current_version')} via {state.get('manager')}",
        f"  path: {state.get('path') or 'unknown'}",
    ]
    latest = state.get("latest_version")
    if latest:
        lines.append(
            f"  latest: {latest}" + ("" if state.get("update_available") else " (already at latest version)")
        )
    else:
        lines.append("  latest: unknown (registry unreachable)")
    shadows = state.get("shadowing_executables") or []
    if shadows:
        lines.append("  other executables on PATH:")
        lines.extend(f"    - {path}" for path in shadows)  # type: ignore[union-attr]
    print("\n".join(lines))


def running_executable_path() -> Path | None:
    """The file that was actually invoked, symlinks resolved.

    `sys.argv[0]` is the console script for a pip/pipx install, and the bundled
    Python entry point for the npm install. Either way it is the only reliable
    evidence of which package manager owns this process.
    """
    raw = sys.argv[0] if sys.argv else ""
    if not raw:
        return None
    candidate = Path(raw)
    if not candidate.exists():
        located = which(candidate.name)
        if not located:
            return None
        candidate = Path(located)
    try:
        return candidate.resolve()
    except OSError:
        return candidate


def _npm_package_root_for(path: Path) -> Path | None:
    """The npm package directory owning `path`, if our package.json is above it."""
    for parent in [path, *path.parents]:
        manifest = parent / "package.json"
        if not manifest.is_file():
            continue
        try:
            payload = json.loads(manifest.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if payload.get("name") == DEFAULT_SELF_UPDATE_PACKAGE:
            return parent
    return None


def detect_running_manager(
    package_name: str = DEFAULT_SELF_UPDATE_PY_PACKAGE,
) -> tuple[str | None, Path | None]:
    """Resolve the package manager that owns the running executable.

    Inferring this from packaging heuristics instead has twice resolved a
    package-manager-installed copy to a different manager, each time installing
    a second executable earlier on PATH that silently shadowed the first.
    """
    executable = running_executable_path()
    if executable is None:
        return None, None

    parts = [part.lower() for part in executable.parts]
    expected = package_name.replace("_", "-").lower()
    for index in range(len(parts) - 2):
        if parts[index] == "pipx" and parts[index + 1] == "venvs" and parts[index + 2] == expected:
            return "pipx", executable

    if _npm_package_root_for(executable) is not None:
        return "npm", executable

    module_root = Path(__file__).resolve().parent
    if _npm_package_root_for(module_root) is not None:
        return "npm", executable

    if "site-packages" in parts or "dist-packages" in parts:
        return "pip", executable
    try:
        metadata.version(package_name)
    except metadata.PackageNotFoundError:
        return None, executable
    return "pip", executable


def _install_root(path: Path) -> Path:
    """The directory an install owns, from any of the entry points inside it.

    item_674: an npm install has two entry points -- `scripts/npm/logics-manager.mjs`,
    the Node wrapper on PATH, and `scripts/logics-manager.py`, the Python entry it
    spawns. Comparing the files reported the one install as a shadow of itself on every
    npm machine. Comparing what contains them does not, while two installs from two
    package managers still land under different roots.
    """
    for parent in path.parents:
        if parent.name == "node_modules":
            return path
        # `.../node_modules/@grifhinz/logics-manager/...` -> the package directory.
        if parent.parent.name == "node_modules" or parent.parent.parent.name == "node_modules":
            return parent
    return path


_SHIM_SUFFIXES = {".cmd", ".bat", ".ps1"}


def _shim_target(path: Path) -> Path | None:
    """The package entry a Windows npm shim launches, or None.

    item_674: on POSIX the PATH entry is a symlink into `node_modules`, so resolving it
    lands inside the install. On Windows npm writes `%APPDATA%\\npm\\logics-manager.cmd`,
    a launcher that lives nowhere near the package, so path shape alone cannot tell the
    one install from a second one. The shim names the entry it runs; read it.
    """
    if path.suffix.lower() not in _SHIM_SUFFIXES:
        return None
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    for token in re.split(r'[\s"\']+', text.replace("%~dp0", str(path.parent) + "\\")):
        if "node_modules" in token:
            candidate = Path(token.replace("\\", "/"))
            if not candidate.is_absolute():
                candidate = path.parent / candidate
            return candidate
    return None


def _executable_identity(path: Path) -> Path:
    """What install a PATH entry belongs to, following a Windows shim first."""
    return _install_root(_shim_target(path) or path)


def shadowing_executables(executable: Path | None, command: str = "logics-manager") -> list[str]:
    """Other executables of the same name on PATH, excluding the running one."""
    if executable is None:
        return []
    running_root = _executable_identity(executable)
    others = []
    for candidate in _find_executable_paths(command):
        try:
            resolved = Path(candidate).resolve()
        except OSError:
            resolved = Path(candidate)
        if resolved != executable and _executable_identity(resolved) != running_root:
            others.append(candidate)
    return others


def _find_executable_paths(command: str) -> list[str]:
    paths: list[str] = []
    seen: set[str] = set()
    names = [command]
    if sys.platform == "win32":
        extensions = [suffix.lower() for suffix in os.environ.get("PATHEXT", ".COM;.EXE;.BAT;.CMD").split(";") if suffix]
        if Path(command).suffix.lower() not in extensions:
            names = [command + extension for extension in extensions]
    for directory in os.environ.get("PATH", "").split(os.pathsep):
        if not directory:
            continue
        for name in names:
            candidate = Path(directory) / name
            try:
                resolved = str(candidate.resolve())
            except OSError:
                resolved = str(candidate)
            if resolved in seen:
                continue
            try:
                is_executable = candidate.exists() and os.access(candidate, os.X_OK)
            except OSError:
                # A PATH entry can point at something the OS refuses to stat
                # at all - observed for real on Windows with an nvm-managed
                # Node shim directory mounted as an "untrusted mount point"
                # (WinError 448). Not executable as far as this check is
                # concerned, not a crash.
                is_executable = False
            if is_executable:
                seen.add(resolved)
                paths.append(str(candidate))
    return paths


def _print_path_conflict_guidance(paths: list[str]) -> None:
    if len(paths) <= 1:
        return
    path_lines = [f"  - {path}" for path in paths]
    print(
        "\n".join(
            [
                "",
                "Multiple logics-manager executables are on PATH. If --version still shows an older release, an earlier install is taking precedence.",
                "Detected executables:",
                *path_lines,
                "Diagnose with:",
                "  type -a logics-manager",
                "  whence -a logics-manager  # zsh",
                "  pipx list",
                "  npm list -g @grifhinz/logics-manager --depth=0",
                "",
                "If you recently changed installs in zsh, run `rehash` or open a new terminal before retrying.",
            ]
        )
    )


def _print_externally_managed_update_guidance(package_name: str) -> None:
    print(
        "\n".join(
            [
                "This Python installation is externally managed, so pip cannot safely update logics-manager in the system environment.",
                "",
                "If this command was installed with pipx, update it with:",
                f"  pipx upgrade {package_name}",
                "",
                "Otherwise migrate the Python install through pipx:",
                "  sudo apt update",
                "  sudo apt install pipx python3-venv",
                "  pipx ensurepath",
                f"  pipx install --force {package_name}",
                "",
                "If you installed the npm package instead, run:",
                f"  npm install -g {DEFAULT_SELF_UPDATE_PACKAGE}@latest",
                "",
                "Advanced override, at your own risk:",
                "  logics-manager update --manager pip --break-system-packages",
            ]
        )
    )


def _is_json_mode(argv: list[str]) -> bool:
    return "--json" in argv or any(argv[index] == "--format" and index + 1 < len(argv) and argv[index + 1] == "json" for index in range(len(argv)))


def _maybe_print_update_notice(command: str, argv: list[str]) -> None:
    if command in {"self-update", "update", "mcp", "view"} or _is_json_mode(argv) or not sys.stdout.isatty():
        return
    notice = get_update_notice(get_cli_version())
    if notice:
        print(notice, file=sys.stderr)


def _warn_on_runtime_drift(raw_argv: list[str]) -> None:
    """Tell the operator once when the runtime is not this repository's version.

    On stderr, so `--format json` stdout stays machine-readable, and with no effect
    on the exit code: a deliberately pinned runtime has to stay usable.
    """
    if not raw_argv or raw_argv[0] not in CORPUS_REPORTING_COMMANDS:
        return
    try:
        repo_root = find_repo_root(Path.cwd())
    except (ConfigError, SystemExit):
        return
    message = drift_message(repo_root, get_cli_version())
    if message:
        print(f"Warning: {message}", file=sys.stderr)


def main(argv: list[str] | None = None) -> int:
    """Run one command, keeping machine-readable output machine-readable.

    A failure used to print a plain-text message even under `--format json`, so
    every caller wrote defensive parsing for output that was JSON on success and
    prose on failure. Errors now leave through the same envelope.
    """
    raw_argv = sys.argv[1:] if argv is None else argv
    json_mode = _is_json_mode(_expand_json_alias(raw_argv))
    _warn_on_runtime_drift(raw_argv)
    try:
        return _dispatch(argv)
    except SystemExit as exc:
        code = exc.code
        if not json_mode or not isinstance(code, str):
            raise
        print(json.dumps({"ok": False, "error": {"code": "command_failed", "message": code}}, indent=2, sort_keys=True))
        return 1


def _dispatch_lint(rest: list[str], command_parser) -> int:
    parser = command_parser("logics-manager lint")
    parser.add_argument("--require-status", action="store_true")
    parser.add_argument(
        "--commit",
        metavar="REF",
        help="Instead of linting the tree, report workflow docs that REF changed without updating an indicator.",
    )
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parsed = parser.parse_args(rest)
    repo_root = find_repo_root(Path.cwd())
    if parsed.commit:
        return _render_commit_lint(repo_root, parsed.commit, parsed.format)
    try:
        payload = lint_payload(repo_root, require_status=parsed.require_status)
        output = render_lint(repo_root, require_status=parsed.require_status, output_format=parsed.format)
    except ConfigError as exc:
        raise SystemExit(str(exc)) from exc
    print(output)
    return 0 if payload["ok"] else 1


def _render_commit_lint(repo_root: Path, ref: str, output_format: str) -> int:
    """`lint --commit REF`: what a commit changed without touching an indicator."""
    findings = commit_indicator_findings(repo_root, ref)
    if output_format == "json":
        print(json.dumps({"commit": ref, "findings": findings}, indent=2, sort_keys=True))
    else:
        summary = "OK" if not findings else f"{len(findings)} doc(s) committed without indicator updates"
        print(f"Logics lint {ref}: {summary}")
        for finding in findings:
            print(f"- {finding['path']}: {finding['message']}")
    return 0 if not findings else 1


def _dispatch(argv: list[str] | None = None) -> int:
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
    argv, repo_root_option = _extract_repo_root(argv)
    if not argv:
        _print_help(_build_root_help())
        return 1
    command = argv[0]
    if command not in ROOT_COMMANDS:
        raise SystemExit(f"Unsupported command: {command}")
    try:
        set_repo_root_override(repo_root_option, require_corpus=command != "bootstrap")
    except ConfigError as exc:
        raise SystemExit(str(exc)) from exc
    _maybe_print_update_notice(command, argv)

    rest = argv[1:]
    if command == "config":
        if rest[:1] in ([], ["-h"], ["--help"]):
            _print_help(
                "\n".join(
                    [
                        "Logics config CLI",
                        "Render the merged runtime config for this repository.",
                        "",
                        "Usage:",
                        "  logics-manager config show [--format text|json]",
                    ]
                )
            )
            return 0 if rest else 1
        if rest[0] != "show":
            raise SystemExit("Usage: logics-manager config show [args...]")
        config_args = rest[1:]
        parser = command_parser("logics-manager config show")
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
        if rest[:1] == ["packaging"]:
            parser = command_parser("logics-manager doctor packaging")
            parser.add_argument("--metadata-only", action="store_true")
            parser.add_argument("--format", choices=("text", "json"), default="text")
            parsed = parser.parse_args(rest[1:])
            repo_root = find_repo_root(Path.cwd())
            try:
                payload = doctor_packaging_payload(repo_root, clean_install=not parsed.metadata_only)
            except ConfigError as exc:
                raise SystemExit(str(exc)) from exc
            if parsed.format == "json":
                print(json.dumps(payload, indent=2, sort_keys=True))
            else:
                lines = ["Logics packaging doctor: OK" if payload["ok"] else "Logics packaging doctor: FAILED"]
                for check in payload["checks"]:
                    lines.append(f"- {check['id']}: {check['status']} ({check['message']})")
                print("\n".join(lines))
            return 0 if payload["ok"] else 1
        doctor_args = rest
        parser = command_parser("logics-manager doctor")
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(doctor_args)
        repo_root = find_repo_root(Path.cwd())
        try:
            doctor_result = doctor_payload(repo_root)
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        print(render_doctor_payload(doctor_result, output_format=parsed.format))
        # req_326: this used to `return 0` while printing FAILED, so a pipeline reading the
        # exit status was told the opposite of the output. Its `doctor packaging` sibling
        # fifteen lines above already did this; v2.20.0 did it for `health`.
        return 0 if doctor_result["ok"] else 1
    if command == "release":
        from .release import main as release_main

        return release_main(rest)
    if command == "roadmap":
        from .roadmap import main as roadmap_main

        return roadmap_main(rest)
    if command == "design":
        from .design import main as design_main

        return design_main(rest)
    if command == "i18n":
        from .i18n import main as i18n_main

        return i18n_main(rest)
    if command == "obsidian":
        from .obsidian import main as obsidian_main

        return obsidian_main(rest)
    if command == "bootstrap":
        parser = command_parser("logics-manager bootstrap")
        parser.add_argument("--check", action="store_true")
        parser.add_argument(
            "--refresh-managed",
            action="store_true",
            help=(
                "req_331: refresh only generated files and marked managed regions "
                "(logics/instructions.md, LOGICS.md's managed block, AGENTS.md/"
                ".gitignore idempotent lines, workflow directory scaffolding) for an "
                "EXISTING corpus. Never creates a new logics/ corpus -- combine with "
                "--check to preview, without it to apply. Safe to call unattended."
            ),
        )
        parser.add_argument(
            "--sync-harnesses",
            action="store_true",
            help=(
                "Also install bundled skills into every detected harness directory "
                "(Claude Code, Codex, Hermes) and wire (or print the snippet for) each "
                "harness's MCP config. Opt-in: this touches files outside the repo "
                "(~/.claude, ~/.codex, ~/.hermes, ~/.gemini), unlike the rest of bootstrap."
            ),
        )
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(rest)
        try:
            repo_root = find_repo_root(Path.cwd())
        except ConfigError:
            repo_root = Path.cwd().resolve()
        payload = bootstrap_payload(
            repo_root,
            check=parsed.check,
            sync_harnesses=parsed.sync_harnesses,
            refresh_managed=parsed.refresh_managed,
        )
        print(render_bootstrap(payload, output_format=parsed.format))
        return 0 if payload["ok"] else 1
    if command in {"self-update", "update"}:
        parser = command_parser(f"logics-manager {command}")
        parser.add_argument("--manager", choices=("auto", "pip", "pipx", "npm"), default="auto")
        parser.add_argument("--package", default=DEFAULT_SELF_UPDATE_PACKAGE)
        parser.add_argument("--python-package", default=DEFAULT_SELF_UPDATE_PY_PACKAGE)
        parser.add_argument("--break-system-packages", action="store_true")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--check", action="store_true", help="Report the update state without installing anything.")
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parser.add_argument(
            "--allow-shadow",
            action="store_true",
            help="Install even though another logics-manager executable is on PATH.",
        )
        parsed = parser.parse_args(rest)
        if command == "self-update" and parsed.format != "json":
            # req_318/item_656: `self-update` and `update` are the same command;
            # `update` is the name to use going forward. Kept fully functional,
            # just steered.
            print("Note: `self-update` is a deprecated alias; use `update` instead.", file=sys.stderr)

        detected_manager, executable = detect_running_manager(parsed.python_package)
        shadows = shadowing_executables(executable)
        manager = parsed.manager
        if manager == "auto":
            manager = detected_manager
        if manager is None:
            # No evidence from the running executable: fall back to the old
            # heuristic chain rather than refusing to update at all.
            if _is_running_from_npm_package() and which("npm"):
                manager = "npm"
            elif _is_running_from_pipx(parsed.python_package) and which("pipx"):
                manager = "pipx"
            else:
                try:
                    metadata.version(parsed.python_package)
                except metadata.PackageNotFoundError:
                    manager = "npm" if which("npm") else "pip"
                else:
                    manager = "pip"

        state = {
            "ok": True,
            "manager": manager,
            "detected_manager": detected_manager,
            "path": str(executable) if executable else None,
            "current_version": get_cli_version(),
            "latest_version": None,
            "updated": False,
            "shadowing_executables": shadows,
        }

        if parsed.check:
            state["latest_version"] = latest_available_version()
            state["update_available"] = bool(
                state["latest_version"] and state["latest_version"] != state["current_version"]
            )
            _print_update_state(state, parsed.format)
            return 0

        # Refuse only when the update would install somewhere other than where the
        # running copy lives -- that is what creates a shadowing second executable,
        # and it is exactly what happened in the field. Duplicates that already
        # exist are reported, not treated as a reason to refuse.
        # When the running executable identifies its own manager, that manager is
        # used and no shadow can be created. The dangerous case is the remaining
        # one: the layout is unrecognised, so the manager is a guess, and another
        # executable is already on PATH -- guessing wrong there is exactly what
        # installed a second, shadowing copy in the field. Refuse rather than
        # guess. An explicit --manager is the operator's decision and passes.
        would_shadow = (
            parsed.manager == "auto"
            and detected_manager is None
            and bool(shadows)
            and not parsed.allow_shadow
        )
        if would_shadow:
            state["ok"] = False
            state["error"] = "ambiguous_install"
            state["message"] = (
                "Refusing to update: this copy's install layout is unrecognised, and other "
                "logics-manager executables are already on PATH, so an automatic choice "
                f"could install a second shadowing copy. Guessed manager: {manager}."
            )
            _print_update_state(state, parsed.format)
            if parsed.format != "json":
                _print_path_conflict_guidance([str(executable), *shadows] if executable else shadows)
                print(
                    "\nRe-run with an explicit `--manager pip|pipx|npm`, or `--allow-shadow` "
                    "to accept the guess."
                )
            return 1
        if shadows and parsed.format != "json":
            print(
                "Warning: other logics-manager executables are on PATH; `logics-manager doctor` lists them.",
                file=sys.stderr,
            )

        if manager == "pip":
            if _is_externally_managed_python() and not parsed.break_system_packages:
                _print_externally_managed_update_guidance(parsed.python_package)
                return 1
            command = [sys.executable, "-m", "pip", "install", "--upgrade", parsed.python_package]
            if parsed.break_system_packages:
                command.append("--break-system-packages")
        elif manager == "pipx":
            pipx = which("pipx")
            if not pipx:
                print("pipx was not found on PATH. Install pipx or update with --manager pip/npm.")
                return 1
            command = [pipx, "upgrade", parsed.python_package]
        else:
            npm = which("npm")
            if not npm:
                print("npm was not found on PATH. Install Node.js/npm or update the package manually.")
                return 1
            command = [npm, "install", "-g", f"{parsed.package}@latest"]

        if parsed.dry_run:
            state["command"] = command
            if parsed.format == "json":
                _print_update_state(state, "json")
            else:
                print("Dry run: " + " ".join(command))
            return 0

        result = subprocess.run(command, check=False)
        state["ok"] = result.returncode == 0
        state["updated"] = result.returncode == 0
        state["exit_code"] = result.returncode
        if result.returncode == 0:
            target = parsed.python_package if manager == "pip" else parsed.package
            if manager == "pipx":
                target = parsed.python_package
            state["package"] = target
            skill_sync = resync_all_harnesses()
            state["skill_sync"] = skill_sync
            if parsed.format == "json":
                state["latest_version"] = latest_available_version()
                _print_update_state(state, "json")
            else:
                print(f"Updated {target} via {manager}.")
                _print_skill_sync_summary(skill_sync)
                if manager == "npm":
                    _print_path_conflict_guidance(_find_executable_paths("logics-manager"))
        elif parsed.format == "json":
            state["error"] = "install_failed"
            state["message"] = f"{manager} exited {result.returncode}."
            _print_update_state(state, "json")
        return result.returncode
    if command == "fleet":
        from .fleet import main as fleet_main

        return fleet_main(rest)
    if command == "flow":
        from .flow import main as flow_main

        return flow_main(rest)
    if command == "sync":
        from .sync import main as sync_main

        return sync_main(rest)
    if command == "assist":
        return assist_main(rest)
    if command == "mcp":
        from .mcp import main as mcp_main

        return mcp_main(rest)
    if command == "skills":
        from .skills import main as skills_main

        return skills_main(rest)
    if command == "view":
        if rest[:1] == ["diagnostics"]:
            from .viewer_diagnostics import render_diagnostics

            parser = command_parser("logics-manager view diagnostics")
            parser.add_argument("--limit", type=int, default=20)
            parser.add_argument("--format", choices=("text", "json"), default="text")
            parsed = parser.parse_args(rest[1:])
            try:
                repo_root = find_repo_root(Path.cwd())
            except ConfigError:
                repo_root = Path.cwd().resolve()
            print(render_diagnostics(repo_root, limit=parsed.limit, output_format=parsed.format))
            return 0
        from .viewer import main as viewer_main

        return viewer_main(rest)
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
                active=parsed.active,
            )
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        output = json.dumps(payload, indent=2, sort_keys=True) if parsed.format == "json" else render_audit(
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
            active=parsed.active,
            include_deferred=parsed.include_deferred,
        )
        print(output)
        return 0 if payload["ok"] else 1
    if command == "index":
        parser = command_parser("logics-manager index")
        parser.add_argument("--out", default="logics/INDEX.md")
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(rest)
        repo_root = find_repo_root(Path.cwd())
        try:
            payload = index_payload(repo_root, out=parsed.out)
        except ConfigError as exc:
            raise SystemExit(str(exc)) from exc
        verb = "Wrote" if payload["changed"] else "Unchanged"
        output = render_payload(payload, parsed.format, f"{verb} {payload['output_path']}")
        print(output)
        return 0 if payload["ok"] else 1
    if command == "status":
        parser = command_parser("logics-manager status")
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
        parser = command_parser("logics-manager health")
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
        # Behavior change: this used to always exit 0, so the reported `ok: false`
        # and the exit status disagreed and a caller had to parse the payload to
        # notice a problem.
        return 0 if payload["ok"] else 1
    if command == "followups":
        parser = command_parser("logics-manager followups")
        parser.add_argument("--limit", type=int, default=50)
        parser.add_argument("--source-kind", choices=("all", "request", "backlog", "task", "product", "roadmap", "architecture"), default="all")
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
        parser = command_parser("logics-manager search")
        parser.add_argument("query")
        parser.add_argument("--kind", choices=("all", "request", "backlog", "task", "product", "roadmap", "architecture", "spec"), default="all")
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
        parser = command_parser("logics-manager product-consistency")
        parser.add_argument("--limit", type=int, default=50)
        parser.add_argument("--strict", action="store_true")
        parser.add_argument("--format", choices=("text", "json"), default="text")
        parsed = parser.parse_args(rest)
        repo_root = find_repo_root(Path.cwd())
        payload = product_consistency_payload(repo_root, limit=parsed.limit)
        print(render_product_consistency(repo_root, output_format=parsed.format, limit=parsed.limit))
        return 1 if parsed.strict and not payload["ok"] else 0
    if command == "lint":
        return _dispatch_lint(rest, command_parser)
    raise SystemExit(f"Unsupported command: {command}")
