"""Resolve, pin, and verify updates through the selected package manager."""
from __future__ import annotations

import json
import re
import subprocess
import sys

from .update_check import is_newer_version


def _query(command: list[str]) -> str:
    result = subprocess.run(command, check=False, capture_output=True, text=True, timeout=60)
    if result.returncode:
        raise ValueError(f"Package manager query exited {result.returncode}.")
    return result.stdout.strip()


def _version(value: str) -> str:
    if not re.fullmatch(r"[0-9][0-9A-Za-z.!+_-]*", value):
        raise ValueError("Package manager returned no valid version.")
    return value


def _commands(parsed, manager: str, cli) -> tuple[list[str], list[str], list[str]]:
    package = parsed.python_package
    if manager == "npm":
        npm = cli.which("npm")
        if not npm:
            raise ValueError("npm was not found on PATH. Install Node.js/npm or update the package manually.")
        return ([npm, "view", parsed.package, "version", "--prefer-online"],
                [npm, "list", "-g", parsed.package, "--depth=0", "--json"],
                [npm, "install", "-g"])
    pip = [sys.executable, "-m", "pip"]
    if manager == "pipx":
        pipx = cli.which("pipx")
        if not pipx:
            raise ValueError("pipx was not found on PATH. Install pipx or update with --manager pip/npm.")
        pip = [pipx, "runpip", package]
    return (pip + ["index", "versions", package, "--no-cache-dir"],
            pip + ["show", package], pip + ["install", "--upgrade"])


def _installed_version(query: list[str], manager: str, package: str) -> str:
    output = _query(query)
    if manager == "npm":
        return _version(json.loads(output)["dependencies"][package]["version"])
    match = re.search(r"^Version: (\S+)\s*$", output, re.MULTILINE)
    return _version(match[1] if match else "")


def _target_version(query: list[str], manager: str) -> str:
    output = _query(query)
    if manager == "npm":
        return _version(output)
    match = re.search(r"^\S+ \(([^)]+)\)", output, re.MULTILINE)
    return _version(match[1] if match else "")


def _fail(state, parsed, cli, error: str, message: str) -> int:
    state.update(ok=False, updated=False, error=error, message=(
        f"{message} Installed version: {state.get('installed_version') or 'unknown'}; "
        f"target version: {state.get('target_version') or 'unresolved'}."
    ))
    cli._print_update_state(state, parsed.format)
    return 1


def run_update(parsed, state, cli) -> int:
    manager = str(state["manager"])
    package = parsed.package if manager == "npm" else parsed.python_package
    state.update(package=package, installed_version=None, target_version=None)
    try:
        target_query, installed_query, install = _commands(parsed, manager, cli)
        installed = _installed_version(installed_query, manager, package)
        state.update(current_version=installed, installed_version=installed)
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as exc:
        return _fail(state, parsed, cli, "installed_version_unknown", f"Cannot read installed version: {exc}")
    try:
        target = _target_version(target_query, manager)
        state.update(latest_version=target, target_version=target, update_available=is_newer_version(target, installed))
    except (OSError, ValueError, subprocess.SubprocessError) as exc:
        return _fail(state, parsed, cli, "registry_unreachable", f"Cannot resolve target version online: {exc}")
    spec = f"{package}@{target}" if manager == "npm" else f"{package}=={target}"
    install += [spec, "--prefer-online" if manager == "npm" else "--no-cache-dir"]
    if manager == "pip" and parsed.break_system_packages:
        install.append("--break-system-packages")
    state["command"] = install
    if parsed.check or parsed.dry_run or not state["update_available"]:
        cli._print_update_state(state, parsed.format)
        if parsed.dry_run and parsed.format != "json":
            print("Dry run: " + " ".join(install))
        return 0
    return _install_and_verify(parsed, state, cli, install, installed_query)


def _install_and_verify(parsed, state, cli, install: list[str], installed_query: list[str]) -> int:
    manager, package, target = state["manager"], state["package"], state["target_version"]
    try:
        result = subprocess.run(install, check=False, capture_output=True, text=True)
        state["exit_code"] = result.returncode
        if result.returncode:
            return _fail(state, parsed, cli, "install_failed", f"{manager} exited {result.returncode}: {result.stderr.strip()}")
        installed = _installed_version(installed_query, manager, package)
        state["installed_version"] = installed
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as exc:
        return _fail(state, parsed, cli, "verification_failed", f"Cannot verify installed version after update to {target}: {exc}")
    if installed != target:
        return _fail(state, parsed, cli, "version_mismatch",
                     f"Update failed: expected {package} {target}, but installed version is {installed} after {manager} reported success.")
    state.update(ok=True, updated=True)
    state["skill_sync"] = cli.resync_all_harnesses()
    if parsed.format == "json":
        cli._print_update_state(state, "json")
    else:
        print(f"Updated {package} via {manager}.")
        print(f"Verified installed version: {installed}")
        cli._print_skill_sync_summary(state["skill_sync"])
        if manager == "npm":
            cli._print_path_conflict_guidance(cli._find_executable_paths("logics-manager"))
    return 0
