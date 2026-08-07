"""One definition decides whether a directory holds a corpus."""
from __future__ import annotations
from pathlib import Path
import pytest
from logics_manager.config import holds_corpus


def test_a_directory_with_a_corpus(tmp_path: Path) -> None:
    (tmp_path / "logics").mkdir()
    assert holds_corpus(tmp_path) is True


def test_a_directory_without_one(tmp_path: Path) -> None:
    assert holds_corpus(tmp_path) is False


def test_a_file_named_logics_is_not_a_corpus(tmp_path: Path) -> None:
    (tmp_path / "logics").write_text("not a directory", encoding="utf-8")
    assert holds_corpus(tmp_path) is False


def test_every_caller_routes_through_it(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """A change to what counts as a corpus must not need four edits."""
    from logics_manager import config, fleet, mcp, viewer

    calls: list[Path] = []

    def spy(path: Path) -> bool:
        calls.append(path)
        return (path / "logics").is_dir()

    for module in (config, fleet, viewer, mcp):
        monkeypatch.setattr(module, "holds_corpus", spy, raising=False)

    (tmp_path / "alpha" / "logics").mkdir(parents=True)
    assert [path.name for path in fleet.discover_corpora(tmp_path)] == ["alpha"]
    assert calls, "fleet discovery bypassed the shared definition"

    calls.clear()
    viewer.viewer_project_entry(tmp_path / "alpha")
    assert calls, "the viewer project entry bypassed the shared definition"
