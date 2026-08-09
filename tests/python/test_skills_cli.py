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
    (tmp_path / ".hermes").mkdir()
    (tmp_path / ".gemini").mkdir()
    profiles = tmp_path / ".cdx" / "profiles"
    (profiles / "claw" / "claude-home").mkdir(parents=True)
    (profiles / "work1").mkdir(parents=True)
    (profiles / "work1" / "config.toml").touch()
    (profiles / "olla").mkdir(parents=True)

    targets = discover_skill_dirs(tmp_path)

    assert targets == [
        tmp_path / ".claude" / "skills",
        tmp_path / ".codex" / "skills",
        tmp_path / ".hermes" / "skills",
        tmp_path / ".gemini" / "config" / "plugins" / "logics-manager" / "skills",
        profiles / "claw" / "claude-home" / ".claude" / "skills",
        profiles / "work1" / "skills",
    ]


def test_installing_into_the_antigravity_plugin_dir_writes_a_manifest(tmp_path: Path) -> None:
    """req_318/item_656 AC13: verified against a real Antigravity install -
    it only discovers skills inside a registered plugin (a skills/ folder
    with a sibling plugin.json), not from a flat shared directory."""
    plugin_skills_dir = tmp_path / ".gemini" / "config" / "plugins" / "logics-manager" / "skills"

    payload = install_skills(["corpus"], plugin_skills_dir, force=False)

    assert payload["installed"] == ["corpus"]
    manifest_path = plugin_skills_dir.parent / "plugin.json"
    assert manifest_path.is_file()
    manifest = manifest_path.read_text(encoding="utf-8")
    assert '"name": "logics-manager"' in manifest

    # A manifest a human already put there is never overwritten.
    manifest_path.write_text('{"name": "hand-written"}', encoding="utf-8")
    install_skills(["corpus"], plugin_skills_dir, force=True)
    assert manifest_path.read_text(encoding="utf-8") == '{"name": "hand-written"}'


def test_installing_into_an_unrelated_skills_dir_writes_no_manifest(tmp_path: Path) -> None:
    install_skills(["corpus"], tmp_path / ".claude" / "skills", force=False)
    assert not (tmp_path / ".claude" / "plugin.json").exists()
