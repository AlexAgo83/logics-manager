from __future__ import annotations

from pathlib import Path

import pytest

from logics_manager.skills import available_skills, discover_skill_dirs, install_skills


def test_available_skills_includes_corpus() -> None:
    skills = available_skills()
    names = [skill["name"] for skill in skills]
    assert "corpus" in names
    corpus = next(skill for skill in skills if skill["name"] == "corpus")
    assert corpus["description"]


def test_install_then_skip_then_force(tmp_path: Path) -> None:
    payload = install_skills([], tmp_path, force=False)
    assert "corpus" in payload["installed"]
    assert (tmp_path / "corpus" / "SKILL.md").is_file()

    payload = install_skills(["corpus"], tmp_path, force=False)
    assert payload["skipped"] == ["corpus"]
    assert payload["installed"] == []

    payload = install_skills(["corpus"], tmp_path, force=True)
    assert payload["installed"] == ["corpus"]


def test_install_unknown_skill_fails(tmp_path: Path) -> None:
    with pytest.raises(SystemExit):
        install_skills(["nope"], tmp_path, force=False)


def test_discover_skill_dirs(tmp_path: Path) -> None:
    (tmp_path / ".codex").mkdir()
    profiles = tmp_path / ".cdx" / "profiles"
    (profiles / "claw" / "claude-home").mkdir(parents=True)
    (profiles / "work1").mkdir(parents=True)
    (profiles / "work1" / "config.toml").touch()
    (profiles / "olla").mkdir(parents=True)

    targets = discover_skill_dirs(tmp_path)

    assert targets == [
        tmp_path / ".claude" / "skills",
        tmp_path / ".codex" / "skills",
        profiles / "claw" / "claude-home" / ".claude" / "skills",
        profiles / "work1" / "skills",
    ]
