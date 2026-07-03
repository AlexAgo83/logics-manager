from __future__ import annotations

from pathlib import Path

import pytest

from logics_manager.skills import available_skills, install_skills


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
