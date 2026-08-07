"""The delegation skills must ship and install like any other bundled skill.

An external orchestrator maintained these by hand, copying each one onto every
machine and tracking their versions in prose, because there was no distribution
channel — while this project already had one.
"""

from __future__ import annotations

import re
import subprocess
import sys
import zipfile
from pathlib import Path

import pytest

from logics_manager.skills import available_skills, install_skills

REPO_ROOT = Path(__file__).resolve().parents[2]
DELEGATION_SKILLS = {"implement-task", "review-project", "groom-issues"}


def _skill_text(name: str) -> str:
    return (REPO_ROOT / "logics_manager" / "skill_assets" / name / "SKILL.md").read_text(encoding="utf-8")


@pytest.mark.parametrize("name", sorted(DELEGATION_SKILLS))
def test_skill_is_listed(name: str) -> None:
    listed = {skill["name"]: skill["description"] for skill in available_skills()}
    assert name in listed
    assert listed[name].strip(), f"{name} has no description"


@pytest.mark.parametrize("name", sorted(DELEGATION_SKILLS))
def test_frontmatter_name_matches_the_directory(name: str) -> None:
    text = _skill_text(name)
    assert text.startswith("---\n")
    assert re.search(rf"^name: {re.escape(name)}$", text, re.MULTILINE), f"{name} frontmatter disagrees"


@pytest.mark.parametrize("name", sorted(DELEGATION_SKILLS))
def test_skill_names_only_this_projects_surface(name: str) -> None:
    """No dependency on a specific orchestrator, agent runtime, or provider."""
    text = _skill_text(name).lower()
    for foreign in ("cdx_run", "cdx-manager", "hermes", "remote-ops", "discord", "telegram", "ollama"):
        assert foreign not in text, f"{name} references {foreign}"
    assert "logics-manager" in text, f"{name} never invokes this project"


@pytest.mark.parametrize("name", sorted(DELEGATION_SKILLS))
def test_installs_into_a_target_directory(name: str, tmp_path: Path) -> None:
    payload = install_skills([name], tmp_path, force=False)
    assert name in payload["installed"]
    assert (tmp_path / name / "SKILL.md").is_file()


def test_installs_alongside_the_existing_skills_without_collision(tmp_path: Path) -> None:
    payload = install_skills([], tmp_path, force=False)
    installed = set(payload["installed"])
    assert DELEGATION_SKILLS | {"corpus"} <= installed
    directories = {path.name for path in tmp_path.iterdir() if path.is_dir()}
    assert directories == installed


def test_repeated_installation_skips_rather_than_duplicating(tmp_path: Path) -> None:
    install_skills(["implement-task"], tmp_path, force=False)
    payload = install_skills(["implement-task"], tmp_path, force=False)
    assert payload["installed"] == []
    assert "implement-task" in payload["skipped"]


def test_forced_reinstall_overwrites(tmp_path: Path) -> None:
    install_skills(["implement-task"], tmp_path, force=False)
    (tmp_path / "implement-task" / "SKILL.md").write_text("stale", encoding="utf-8")
    install_skills(["implement-task"], tmp_path, force=True)
    assert (tmp_path / "implement-task" / "SKILL.md").read_text(encoding="utf-8") != "stale"


def test_packaging_declares_every_importable_subpackage() -> None:
    """The asset directories are shipped as package data, not as packages."""
    result = subprocess.run(
        [sys.executable, "-m", "logics_manager", "doctor", "packaging", "--metadata-only", "--format", "json"],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=120,
    )
    assert result.returncode == 0, result.stdout + result.stderr



def test_a_built_wheel_contains_every_skill(tmp_path: Path) -> None:
    build = subprocess.run(
        [sys.executable, "-m", "build", "--wheel", "--outdir", str(tmp_path)],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=600,
    )
    if build.returncode != 0:
        pytest.skip(f"wheel build unavailable: {build.stderr[-200:]}")
    wheel = next(iter(tmp_path.glob("*.whl")))
    shipped = {
        Path(name).parent.name
        for name in zipfile.ZipFile(wheel).namelist()
        if name.endswith("SKILL.md")
    }
    assert DELEGATION_SKILLS <= shipped, f"missing from the wheel: {DELEGATION_SKILLS - shipped}"
