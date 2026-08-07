"""Every mutating MCP tool must preview with `dry_run`, using one shape.

Some tools previewed and others applied immediately, with no principle telling
them apart, so an external wrapper had to repeat "no dry run available, this
takes effect immediately" in its own tool descriptions.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from logics_manager import mcp

REPO_ROOT = Path(__file__).resolve().parents[2]

MUTATING_TOOLS = sorted(
    name for name, capability in mcp.TOOL_CAPABILITIES.items() if capability != mcp.READ_ONLY
)

# One minimal valid argument set per tool that creates or promotes something.
# Tools needing an existing target are exercised against the fixture corpus.
PREVIEWABLE = {
    "create_request": {
        "title": "Preview probe",
        "needs": ["n"],
        "context": ["c"],
        "acceptance_criteria": ["a"],
    },
    "create_product_brief": {"title": "Preview brief"},
    "create_architecture_decision": {"title": "Preview decision"},
    "create_roadmap": {"title": "Preview roadmap"},
    "autofix_ac_traceability": {},
    "autofix_structure": {},
}


@pytest.fixture
def corpus(tmp_path: Path) -> Path:
    target = tmp_path / "corpus"
    target.mkdir()
    # the apply path reports a git diff alongside the write
    for command in (["git", "init", "-q"], ["git", "add", "-A"]):
        subprocess.run(command, cwd=target, check=True, timeout=60)
    result = subprocess.run(
        [sys.executable, "-m", "logics_manager", "bootstrap", "--repo-root", str(target)],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    return target


def _call(tool: str, arguments: dict, corpus: Path) -> dict:
    result = subprocess.run(
        [
            sys.executable, "-m", "logics_manager", "mcp", "call", tool,
            "--arguments", json.dumps(arguments), "--repo-root", str(corpus),
        ],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=120,
    )
    return json.loads(result.stdout)


def _corpus_snapshot(corpus: Path) -> dict[str, bytes]:
    return {
        str(path.relative_to(corpus)): path.read_bytes()
        for path in sorted((corpus / "logics").rglob("*"))
        if path.is_file()
    }


@pytest.mark.parametrize("tool", MUTATING_TOOLS)
def test_every_mutating_tool_declares_dry_run(tool: str) -> None:
    properties = mcp.TOOLS_BY_NAME[tool]["inputSchema"]["properties"]
    assert "dry_run" in properties, f"{tool} has no dry_run argument"
    assert properties["dry_run"] == {"type": "boolean"}


@pytest.mark.parametrize("tool", sorted(PREVIEWABLE))
def test_dry_run_writes_nothing(tool: str, corpus: Path) -> None:
    before = _corpus_snapshot(corpus)
    payload = _call(tool, {**PREVIEWABLE[tool], "dry_run": True}, corpus)
    assert payload["ok"] is True, payload
    assert payload["dry_run"] is True
    assert _corpus_snapshot(corpus) == before, f"{tool} wrote during a dry run"


@pytest.mark.parametrize("tool", sorted(PREVIEWABLE))
def test_preview_payloads_share_one_shape(tool: str, corpus: Path) -> None:
    payload = _call(tool, {**PREVIEWABLE[tool], "dry_run": True}, corpus)
    for key in ("ok", "dry_run", "summary", "planned_paths", "planned_refs"):
        assert key in payload, f"{tool} preview is missing {key}"
    assert isinstance(payload["planned_paths"], list)
    assert isinstance(payload["planned_refs"], list)


def test_preview_then_apply_produces_what_was_previewed(corpus: Path) -> None:
    arguments = {
        "title": "Round trip probe",
        "needs": ["n"],
        "context": ["c"],
        "acceptance_criteria": ["a"],
    }
    preview = _call("create_request", {**arguments, "dry_run": True}, corpus)
    applied = _call("create_request", arguments, corpus)
    assert applied["ok"] is True, applied
    assert preview["planned_paths"] == [applied["path"]]
    assert preview["planned_refs"] == [applied["ref"]]
    assert (corpus / applied["path"]).is_file()


def test_omitting_dry_run_still_applies(corpus: Path) -> None:
    """The default for each tool is unchanged: no flag means apply."""
    payload = _call("create_product_brief", {"title": "Applied brief"}, corpus)
    assert payload["ok"] is True, payload
    assert "dry_run" not in payload
    assert (corpus / payload["path"]).is_file()


def test_promotion_previews_without_writing(corpus: Path) -> None:
    created = _call(
        "create_request",
        {"title": "Promotable", "needs": ["n"], "context": ["c"], "acceptance_criteria": ["a"]},
        corpus,
    )
    before = _corpus_snapshot(corpus)
    preview = _call("promote_request_to_backlog", {"request_path": created["path"], "dry_run": True}, corpus)
    assert preview["ok"] is True and preview["dry_run"] is True, preview
    assert preview["planned_refs"], "preview named no backlog ref"
    assert _corpus_snapshot(corpus) == before
