from __future__ import annotations

from pathlib import Path

from logics_manager.viewer import _resolve_asset_root


def test_repo_source_preferred_when_present(tmp_path: Path) -> None:
    repo = tmp_path / "clients" / "shared-web" / "media"
    repo.mkdir(parents=True)
    packaged = tmp_path / "viewer_assets" / "media"
    packaged.mkdir(parents=True)
    # Both present: the live repo tree wins (AC2 holds for pip installs, where
    # the repo tree is simply absent — covered below).
    assert _resolve_asset_root(repo, packaged) == repo


def test_falls_back_to_packaged_when_repo_absent(tmp_path: Path) -> None:
    repo = tmp_path / "clients" / "shared-web" / "media"  # not created
    packaged = tmp_path / "viewer_assets" / "media"
    packaged.mkdir(parents=True)
    # AC1: a fresh clone / install without the repo source serves the packaged mirror.
    assert _resolve_asset_root(repo, packaged) == packaged


def test_marker_gates_repo_candidate(tmp_path: Path) -> None:
    repo = tmp_path / "clients" / "viewer"
    repo.mkdir(parents=True)  # dir exists but the marker file does not
    packaged = tmp_path / "viewer_assets" / "viewer"
    packaged.mkdir(parents=True)
    assert _resolve_asset_root(repo, packaged, marker="index.html") == packaged
    (repo / "index.html").write_text("<!doctype html>", encoding="utf-8")
    assert _resolve_asset_root(repo, packaged, marker="index.html") == repo
