"""Regression tests for item_625: the flow vocabulary lifted into its own module.

The cut must be invisible from outside. What would break silently is the package's public
surface: callers and tests import these names from `logics_manager.flow`, and a lift that
forgot to re-export one would only fail wherever that name happens to be used.
"""

from __future__ import annotations

import ast
import importlib
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.fixture(scope="module")
def flow():
    return importlib.import_module("logics_manager.flow")


def _top_level_names(path: Path) -> set[str]:
    names: set[str] = set()
    for node in ast.parse(path.read_text(encoding="utf-8")).body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            names.add(node.name)
        elif isinstance(node, (ast.Assign, ast.AnnAssign)):
            target = node.targets[0] if isinstance(node, ast.Assign) else node.target
            if isinstance(target, ast.Name):
                names.add(target.id)
    return names


def test_every_lifted_name_is_still_reachable_from_the_package(flow) -> None:
    lifted = _top_level_names(Path("logics_manager/flow/docs.py"))
    missing = sorted(name for name in lifted if not hasattr(flow, name))
    assert not missing, f"lifted out of the package's surface: {missing}"


def test_the_vocabulary_does_not_reach_back_for_a_verb() -> None:
    """The dependency runs one way, which is what makes the module importable alone."""
    result = subprocess.run(
        [sys.executable, "-c", "import logics_manager.flow.docs as d; print(len(dir(d)))"],
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    source = Path("logics_manager/flow/docs.py").read_text(encoding="utf-8")
    assert "from . import" not in source, "the vocabulary imports a sibling; the cut is not one-way"
    assert "flow import" not in source


@pytest.mark.parametrize(
    "name",
    [
        "closeout_payload",
        "repair_gates_payload",
        "repair_links_payload",
        "repair_mermaid_payload",
        "scaffold_request_chain_payload",
        "validate_closeout_payload",
        "build_parser",
        "main",
    ],
)
def test_the_verbs_stayed_where_their_callers_expect_them(flow, name: str) -> None:
    assert hasattr(flow, name)


def test_every_help_screen_still_resolves_its_flags_from_the_parser() -> None:
    from logics_manager.help_flags import declared_flags, subparser_for

    parser = importlib.import_module("logics_manager.flow").build_parser()
    printed = subprocess.run(
        [sys.executable, "-m", "logics_manager", "flow", "closeout", "--help"],
        capture_output=True,
        text=True,
        timeout=60,
    ).stdout
    for flag in declared_flags(subparser_for(parser, ["closeout"])):
        assert flag in printed, f"`flow closeout --help` no longer names {flag}"
