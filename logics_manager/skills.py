from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from .cli_output import print_payload

SKILL_ASSETS_ROOT = Path(__file__).parent / "skill_assets"
DEFAULT_TARGET_DIR = Path.home() / ".claude" / "skills"


def _real_home() -> Path:
    home = Path.home()
    parts = home.parts
    if ".cdx" in parts:
        # cdx profiles override HOME; walk back up to the real user home
        return Path(*parts[: parts.index(".cdx")])
    return home


def discover_skill_dirs(home: Path | None = None) -> list[Path]:
    """Find every harness skills directory on this machine (Claude Code and Codex share the skills/<name>/SKILL.md format)."""
    home = home or _real_home()
    targets = [home / ".claude" / "skills"]
    if (home / ".codex").is_dir():
        targets.append(home / ".codex" / "skills")
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


def install_skills(names: list[str], target_dir: Path, *, force: bool) -> dict[str, object]:
    known = {skill["name"] for skill in available_skills()}
    selected = names or sorted(known)
    unknown = [name for name in selected if name not in known]
    if unknown:
        raise SystemExit(f"Unknown skill(s): {', '.join(unknown)}. Run: logics-manager skills list")
    installed: list[str] = []
    skipped: list[str] = []
    for name in selected:
        destination = target_dir / name
        if destination.exists():
            if not force:
                skipped.append(name)
                continue
            shutil.rmtree(destination)
        shutil.copytree(SKILL_ASSETS_ROOT / name, destination)
        installed.append(name)
    return {
        "command": "skills",
        "kind": "install",
        "target_dir": target_dir.as_posix(),
        "installed": installed,
        "skipped": skipped,
        "ok": True,
    }


def _render_install(payload: dict[str, object]) -> str:
    lines = []
    for name in payload["installed"]:
        lines.append(f"Installed skill '{name}' to {payload['target_dir']}/{name}")
    for name in payload["skipped"]:
        lines.append(f"Skipped '{name}' in {payload['target_dir']}: already installed (use --force to overwrite)")
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
        targets = [Path(parsed.target_dir).expanduser() if parsed.target_dir else DEFAULT_TARGET_DIR]
    results = []
    for target_dir in targets:
        target_dir.mkdir(parents=True, exist_ok=True)
        results.append(install_skills(parsed.names, target_dir, force=parsed.force))
    payload = {"command": "skills", "kind": "install", "targets": results, "ok": True}
    print_payload(payload, parsed.format, lambda: "\n".join(_render_install(result) for result in results))
    return 0
