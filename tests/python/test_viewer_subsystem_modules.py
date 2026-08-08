"""Regression tests for item_623: cdx and git lifted out of the viewer server.

The lift must be invisible from outside. These pin the two properties that would break
silently: the names viewer.py used to define are still importable from it, and the routes
those sub-systems own are still reachable through the request handler.
"""

from __future__ import annotations

import importlib

import pytest


CDX_NAMES = [
    "cdx_status_payload",
    "cdx_runs_payload",
    "cdx_disk_payload",
    "cdx_mission_plan_payload",
    "cdx_config_payload",
    "create_request_from_cdx_report",
    "CDX_MISSION_CATALOG",
]
GIT_NAMES = [
    "git_status_payload",
    "git_commit_payload",
    "git_diff_payload",
    "git_commit_diff_payload",
    "git_file_preview_payload",
    "github_repo_url",
    "gitlab_repo_url",
]


@pytest.mark.parametrize("name", CDX_NAMES + GIT_NAMES)
def test_lifted_names_are_still_reachable_from_the_viewer_module(name: str) -> None:
    viewer = importlib.import_module("logics_manager.viewer")
    assert hasattr(viewer, name), f"`from logics_manager.viewer import {name}` no longer works"


@pytest.mark.parametrize(
    ("module", "names"),
    [("logics_manager.viewer_cdx", CDX_NAMES), ("logics_manager.viewer_git", GIT_NAMES)],
)
def test_each_sub_system_owns_its_names(module: str, names: list[str]) -> None:
    lifted = importlib.import_module(module)
    for name in names:
        assert hasattr(lifted, name), f"{module} does not define {name}"


def test_the_sub_systems_import_in_either_order() -> None:
    """They reach the viewer through the module object, not by importing its names."""
    import subprocess
    import sys

    for first in ("logics_manager.viewer_cdx", "logics_manager.viewer_git"):
        result = subprocess.run(
            [sys.executable, "-c", f"import {first}; import logics_manager.viewer"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        assert result.returncode == 0, f"importing {first} first failed:\n{result.stderr}"


def test_the_handler_still_routes_to_both_sub_systems() -> None:
    viewer = importlib.import_module("logics_manager.viewer")
    handler_source = viewer.LogicsViewerRequestHandler.__doc__ or ""
    del handler_source
    # The routes are declared, not inferred: a lift that dropped one would leave its path
    # unreachable while every unit test still passed.
    routes = viewer.VIEWER_MUTATING_ROUTES
    assert any("/api/git" in route for route in routes), "no git route survived the lift"
    assert any("/api/cdx" in route for route in routes), "no cdx route survived the lift"
