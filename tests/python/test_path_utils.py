"""req_323/item_668: the repo-root path-escape guard, consolidated.

Four call sites (`mcp.py`, `viewer.py`, `viewer_git.py`,
`viewer_project_tools.py`) each reimplemented this containment check
independently, at different levels of strictness. `path_utils.py`'s
`relative_to_root()`/`has_symlink_segment()` are now the one shared
primitive; these tests prove the strictest existing behavior - rejecting a
symlink even when it points back inside the repo - now applies uniformly
everywhere, not only at the one call site that used to catch it.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from logics_manager.path_utils import PathEscapesRoot, has_symlink_segment, relative_to_root


def test_relative_to_root_accepts_a_path_inside(tmp_path: Path) -> None:
    (tmp_path / "sub").mkdir()
    assert relative_to_root(tmp_path / "sub" / "file.md", tmp_path) == Path("sub/file.md")


def test_relative_to_root_accepts_the_root_itself(tmp_path: Path) -> None:
    assert relative_to_root(tmp_path, tmp_path) == Path(".")


def test_relative_to_root_rejects_a_path_outside(tmp_path: Path) -> None:
    outside = tmp_path.parent / "elsewhere"
    with pytest.raises(PathEscapesRoot):
        relative_to_root(outside, tmp_path)


def test_has_symlink_segment_false_for_a_plain_path(tmp_path: Path) -> None:
    (tmp_path / "sub").mkdir()
    (tmp_path / "sub" / "file.md").write_text("x", encoding="utf-8")
    assert has_symlink_segment(tmp_path, Path("sub/file.md")) is False


def test_has_symlink_segment_true_even_when_the_symlink_points_back_inside_root(tmp_path: Path) -> None:
    """The case only the strictest of the four guards previously caught."""
    real_dir = tmp_path / "real"
    real_dir.mkdir()
    (real_dir / "file.md").write_text("x", encoding="utf-8")
    link = tmp_path / "link"
    link.symlink_to(real_dir)
    # link -> real, and real is itself inside tmp_path: a naive final
    # `.resolve().relative_to(root)` check would pass this, since the fully
    # resolved target IS inside root. The symlink walk rejects it anyway.
    assert has_symlink_segment(tmp_path, Path("link/file.md")) is True


def _write_repo_config(root: Path) -> None:
    (root / "logics.yaml").write_text("", encoding="utf-8")


# --- The four consolidated call sites -------------------------------------


def test_mcp_relative_path_rejects_a_symlink_that_points_back_inside_the_repo(tmp_path: Path) -> None:
    from logics_manager.mcp import McpToolError, _relative_path

    real_dir = tmp_path / "logics" / "request"
    real_dir.mkdir(parents=True)
    (real_dir / "req_001_demo.md").write_text("x", encoding="utf-8")
    link = tmp_path / "logics" / "link"
    link.symlink_to(real_dir)

    with pytest.raises(McpToolError):
        _relative_path(tmp_path, "logics/link/req_001_demo.md", ("logics",))


def test_viewer_resolve_repo_doc_path_rejects_a_symlink_that_points_back_inside_the_repo(tmp_path: Path) -> None:
    from logics_manager.viewer import _resolve_repo_doc_path

    real_dir = tmp_path / "logics"
    real_dir.mkdir()
    (real_dir / "req_001_demo.md").write_text("x", encoding="utf-8")
    link = tmp_path / "link"
    link.symlink_to(real_dir)

    with pytest.raises(ValueError):
        _resolve_repo_doc_path(tmp_path, "link/req_001_demo.md")


def test_viewer_git_normalize_file_path_rejects_a_symlink_that_points_back_inside_the_repo(tmp_path: Path) -> None:
    from logics_manager.viewer_git import _normalize_git_file_path

    real_dir = tmp_path / "src"
    real_dir.mkdir()
    (real_dir / "file.py").write_text("x", encoding="utf-8")
    link = tmp_path / "link"
    link.symlink_to(real_dir)

    assert _normalize_git_file_path(tmp_path, "link/file.py") is None
    assert _normalize_git_file_path(tmp_path, "src/file.py") == "src/file.py"


def test_viewer_project_tools_inside_file_rejects_a_symlink_that_points_back_inside_the_repo(tmp_path: Path) -> None:
    from logics_manager.viewer_project_tools import _inside_file

    real_dir = tmp_path / "src"
    real_dir.mkdir()
    (real_dir / "file.ts").write_text("x", encoding="utf-8")
    link = tmp_path / "link"
    link.symlink_to(real_dir)

    with pytest.raises(ValueError):
        _inside_file(tmp_path, "link/file.ts")
    assert _inside_file(tmp_path, "src/file.ts") == (real_dir / "file.ts").resolve()
