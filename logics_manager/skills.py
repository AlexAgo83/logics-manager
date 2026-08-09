from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from .cli_output import print_payload
from .update_check import current_version

SKILL_ASSETS_ROOT = Path(__file__).parent / "skill_assets"


def _default_target_dir() -> Path:
    # Lazy on purpose: this used to run Path.home() at import time, so any
    # environment without a resolvable home directory (no HOME/USERPROFILE,
    # e.g. a deliberately sanitized subprocess env) failed to import
    # logics_manager at all, crashing every command, not just skills install.
    return Path.home() / ".claude" / "skills"

# req_318/item_656 AC13: verified against a real Antigravity install.
# Unlike Claude Code/Codex/Hermes's flat skills/ directories, Antigravity only
# discovers skills inside a registered plugin - confirmed by inspecting an
# installed plugin (chrome-devtools-plugin) on a real machine: it ships a
# sibling plugin.json manifest next to its skills/ folder, and no top-level
# ~/.gemini/config/skills, ~/.gemini/skills, or <project>/.agents/skills
# existed at all. Dropping SKILL.md files into skills/ alone is not enough;
# the manifest is what makes Antigravity treat the directory as a plugin.
_ANTIGRAVITY_PLUGIN_NAME = "logics-manager"

# req_318/item_656: this sidecar is what tells drift detection "stale" from
# "hand-modified" apart. It records the hash of the bundled skill *as of the
# install that wrote it* - if a later bundled version differs, the installed
# copy is stale and safe to refresh; if the installed copy no longer matches
# what this sidecar recorded, a human changed it since, and it is left alone.
_BUNDLED_HASH_SIDECAR = ".bundled-hash"


def _dir_hash(path: Path) -> str:
    hasher = hashlib.sha256()
    for file in sorted(p for p in path.rglob("*") if p.is_file() and p.name != _BUNDLED_HASH_SIDECAR):
        hasher.update(file.relative_to(path).as_posix().encode("utf-8"))
        hasher.update(file.read_bytes())
    return hasher.hexdigest()


def _real_home() -> Path:
    home = Path.home()
    parts = home.parts
    if ".cdx" in parts:
        # cdx profiles override HOME; walk back up to the real user home
        return Path(*parts[: parts.index(".cdx")])
    return home


def discover_skill_dirs(home: Path | None = None) -> list[Path]:
    """Find every harness skills directory on this machine (Claude Code, Codex,
    and Hermes share the skills/<name>/SKILL.md format under the agentskills.io
    convention; Antigravity's equivalent is one level deeper, inside its own
    plugin - see `_ANTIGRAVITY_PLUGIN_NAME` above).
    """
    home = home or _real_home()
    targets = [home / ".claude" / "skills"]
    if (home / ".codex").is_dir():
        targets.append(home / ".codex" / "skills")
    if (home / ".hermes").is_dir():
        targets.append(home / ".hermes" / "skills")
    if (home / ".gemini").is_dir():
        targets.append(home / ".gemini" / "config" / "plugins" / _ANTIGRAVITY_PLUGIN_NAME / "skills")
    profiles = home / ".cdx" / "profiles"
    if profiles.is_dir():
        for profile in sorted(profiles.iterdir()):
            if (profile / "claude-home").is_dir():
                targets.append(profile / "claude-home" / ".claude" / "skills")
            elif (profile / "config.toml").is_file():
                targets.append(profile / "skills")
    return targets


def available_skills() -> list[dict[str, str]]:
    skills = []
    for skill_md in sorted(SKILL_ASSETS_ROOT.glob("*/SKILL.md")):
        description = ""
        for line in skill_md.read_text(encoding="utf-8").splitlines():
            if line.startswith("description:"):
                description = line.removeprefix("description:").strip()
                break
        skills.append({"name": skill_md.parent.name, "description": description})
    return skills


def _is_antigravity_plugin_skills_dir(target_dir: Path) -> bool:
    parts = target_dir.parts
    return (
        target_dir.name == "skills"
        and target_dir.parent.name == _ANTIGRAVITY_PLUGIN_NAME
        and len(parts) >= 2
        and parts[-3] == "plugins"
    )


def _ensure_antigravity_plugin_manifest(plugin_dir: Path) -> None:
    manifest = plugin_dir / "plugin.json"
    if manifest.is_file():
        return
    plugin_dir.mkdir(parents=True, exist_ok=True)
    manifest.write_text(
        json.dumps(
            {
                "name": _ANTIGRAVITY_PLUGIN_NAME,
                "version": current_version(),
                "description": "Logics workflow skills and MCP server for logics-manager.",
                "author": {"name": "cdx-logics"},
                "repository": "https://github.com/AlexAgo83/logics-manager.git",
                "license": "MIT",
                "keywords": ["logics", "workflow", "orchestration", "mcp", "skills"],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def install_skills(names: list[str], target_dir: Path, *, force: bool) -> dict[str, object]:
    if _is_antigravity_plugin_skills_dir(target_dir):
        _ensure_antigravity_plugin_manifest(target_dir.parent)
    known = {skill["name"] for skill in available_skills()}
    selected = names or sorted(known)
    unknown = [name for name in selected if name not in known]
    if unknown:
        raise SystemExit(f"Unknown skill(s): {', '.join(unknown)}. Run: logics-manager skills list")
    installed: list[str] = []
    refreshed: list[str] = []
    skipped: list[str] = []
    hand_modified: list[str] = []
    for name in selected:
        destination = target_dir / name
        bundled_hash = _dir_hash(SKILL_ASSETS_ROOT / name)

        if not destination.exists():
            shutil.copytree(SKILL_ASSETS_ROOT / name, destination)
            (destination / _BUNDLED_HASH_SIDECAR).write_text(bundled_hash, encoding="utf-8")
            installed.append(name)
            continue

        if force:
            # --force means "reinstall, full stop" - the original, unconditional
            # semantic. Not routed through drift detection: it doesn't matter here
            # whether the content is stale or hand-modified.
            shutil.rmtree(destination)
            shutil.copytree(SKILL_ASSETS_ROOT / name, destination)
            (destination / _BUNDLED_HASH_SIDECAR).write_text(bundled_hash, encoding="utf-8")
            installed.append(name)
            continue

        current_hash = _dir_hash(destination)
        if current_hash == bundled_hash:
            skipped.append(name)
            continue

        recorded_hash = None
        sidecar = destination / _BUNDLED_HASH_SIDECAR
        if sidecar.is_file():
            recorded_hash = sidecar.read_text(encoding="utf-8").strip()
        is_stale = recorded_hash is not None and recorded_hash == current_hash
        if not is_stale:
            # Installed content differs from the current bundle, and does not
            # match what we last wrote here - a human changed it since. Leave
            # it alone rather than silently discarding an intentional edit.
            hand_modified.append(name)
            continue
        shutil.rmtree(destination)
        shutil.copytree(SKILL_ASSETS_ROOT / name, destination)
        (destination / _BUNDLED_HASH_SIDECAR).write_text(bundled_hash, encoding="utf-8")
        refreshed.append(name)
    return {
        "command": "skills",
        "kind": "install",
        "target_dir": target_dir.as_posix(),
        "installed": installed,
        "refreshed": refreshed,
        "skipped": skipped,
        "hand_modified": hand_modified,
        "ok": True,
    }


def resync_all_harnesses(*, create_missing: bool = False) -> dict[str, object]:
    """req_318: shared by `update`/`self-update` (cli.py) and `bootstrap`
    (bootstrap.py) so both re-sync skills into every detected harness
    directory through the one drift-aware `install_skills()` path, instead
    of two call sites duplicating the same loop.

    `create_missing=False` (the `update` default) never invents a fresh
    install for a harness directory that doesn't exist yet - `update` is
    about refreshing what's already there, not onboarding a new machine.
    `bootstrap --sync-harnesses` passes `create_missing=True`: that command
    is exactly the "get this machine set up from scratch" moment.
    """
    results = []
    for target_dir in discover_skill_dirs():
        if not target_dir.is_dir():
            if not create_missing:
                continue
            target_dir.mkdir(parents=True, exist_ok=True)
        results.append(install_skills([], target_dir, force=False))
    return {"targets": results}


def _render_install(payload: dict[str, object]) -> str:
    lines = []
    for name in payload["installed"]:
        lines.append(f"Installed skill '{name}' to {payload['target_dir']}/{name}")
    for name in payload.get("refreshed", []):
        lines.append(f"Refreshed stale skill '{name}' in {payload['target_dir']}")
    for name in payload["skipped"]:
        lines.append(f"Skipped '{name}' in {payload['target_dir']}: already up to date")
    for name in payload.get("hand_modified", []):
        lines.append(f"Left '{name}' in {payload['target_dir']} alone: its content was hand-modified (use --force to overwrite)")
    return "\n".join(lines) or "Nothing to install."


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="logics-manager skills")
    sub = parser.add_subparsers(dest="command", required=True)

    list_parser = sub.add_parser("list", help="List agent skills bundled with logics-manager.")
    list_parser.add_argument("--format", choices=("text", "json"), default="text")

    install = sub.add_parser("install", help="Install bundled agent skills into a harness skills directory.")
    install.add_argument("names", nargs="*", help="Skill names to install (default: all).")
    install.add_argument("--target-dir", default=None, help="Skills directory (default: ~/.claude/skills).")
    install.add_argument("--all-profiles", action="store_true", help="Install into every detected harness skills directory (~/.claude, ~/.codex, cdx profiles).")
    install.add_argument("--force", action="store_true", help="Overwrite an already-installed skill.")
    install.add_argument("--format", choices=("text", "json"), default="text")

    parsed = parser.parse_args(argv)
    if parsed.command == "list":
        skills = available_skills()
        payload = {"command": "skills", "kind": "list", "skills": skills, "ok": True}
        text = "\n".join(f"{skill['name']}  {skill['description']}" for skill in skills) or "No bundled skills."
        print_payload(payload, parsed.format, text)
        return 0

    if parsed.all_profiles and parsed.target_dir:
        raise SystemExit("--all-profiles and --target-dir are mutually exclusive.")
    if parsed.all_profiles:
        targets = discover_skill_dirs()
    else:
        targets = [Path(parsed.target_dir).expanduser() if parsed.target_dir else _default_target_dir()]
    results = []
    for target_dir in targets:
        target_dir.mkdir(parents=True, exist_ok=True)
        results.append(install_skills(parsed.names, target_dir, force=parsed.force))
    payload = {"command": "skills", "kind": "install", "targets": results, "ok": True}
    print_payload(payload, parsed.format, lambda: "\n".join(_render_install(result) for result in results))
    return 0
