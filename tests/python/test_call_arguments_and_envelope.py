"""Tool arguments must not need shell quoting, and JSON output must stay JSON.

Inline JSON was the only way to pass tool arguments, so an embedder pushing
structured data through an SSH or cmd.exe quoting chain had to escape it by
hand; one integration gave up and restricted every mutating call to local
execution. Separately, a failure printed prose even under `--format json`, so
callers wrote defensive parsing for output that changed shape on error.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from logics_manager.mcp import resolve_call_arguments

REPO_ROOT = Path(__file__).resolve().parents[2]

AWKWARD = {
    "title": 'He said "hi" & ran `ls`',
    "needs": ["line one\nline two", "tab\there"],
    "context": ["a 'quoted' value", "back\\slash"],
    "acceptance_criteria": ["$(not a command)"],
}


def _run(args: list[str], stdin: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "logics_manager", *args],
        cwd=REPO_ROOT,
        input=stdin,
        capture_output=True,
        text=True,
        timeout=60,
    )


# ---- argument sources ----


def test_inline_json_still_works() -> None:
    assert resolve_call_arguments('{"limit": 3}') == {"limit": 3}


def test_empty_source_is_an_empty_object() -> None:
    assert resolve_call_arguments("") == {}
    assert resolve_call_arguments("{}") == {}


def test_arguments_from_a_file(tmp_path: Path) -> None:
    path = tmp_path / "args.json"
    path.write_text(json.dumps(AWKWARD), encoding="utf-8")
    assert resolve_call_arguments(f"@{path}") == AWKWARD


def test_arguments_from_stdin() -> None:
    result = _run(
        ["mcp", "call", "list_logics_docs", "--arguments", "@-"],
        stdin=json.dumps({"kind": "request", "limit": 1}),
    )
    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    assert payload["filters"]["kind"] == "request"


def test_awkward_payload_round_trips_through_stdin(tmp_path: Path) -> None:
    """Quotes, newlines, backslashes and shell metacharacters must survive intact."""
    result = _run(
        ["mcp", "call", "create_request", "--arguments", "@-"],
        stdin=json.dumps({**AWKWARD, "dry_run": True}),
    )
    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    assert payload["dry_run"] is True
    assert payload["planned_refs"], payload


def test_key_value_pairs() -> None:
    assert resolve_call_arguments("{}", ["kind=request", "limit=5"]) == {"kind": "request", "limit": 5}


def test_key_value_pairs_parse_json_scalars() -> None:
    parsed = resolve_call_arguments("{}", ["dry_run=true", "limit=2", "name=plain"])
    assert parsed == {"dry_run": True, "limit": 2, "name": "plain"}


def test_key_value_pairs_override_the_base_object() -> None:
    assert resolve_call_arguments('{"limit": 1}', ["limit=9"]) == {"limit": 9}


def test_value_may_contain_equals_signs() -> None:
    assert resolve_call_arguments("{}", ["query=a=b=c"]) == {"query": "a=b=c"}


@pytest.mark.parametrize("pair", ["novalue", "=empty"])
def test_malformed_pairs_are_rejected(pair: str) -> None:
    with pytest.raises(ValueError, match="Invalid --arg"):
        resolve_call_arguments("{}", [pair])


def test_non_object_json_is_rejected() -> None:
    with pytest.raises(ValueError, match="must be a JSON object"):
        resolve_call_arguments("[1, 2]")


def test_invalid_json_is_rejected() -> None:
    with pytest.raises(ValueError, match="Invalid JSON"):
        resolve_call_arguments("{nope}")


def test_unreadable_file_is_reported(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="Could not read arguments file"):
        resolve_call_arguments(f"@{tmp_path / 'absent.json'}")


# ---- output envelope ----


def test_failure_under_json_format_is_json() -> None:
    result = _run(["sync", "read-doc", "definitely_not_a_ref_999", "--format", "json"])
    assert result.returncode == 1
    payload = json.loads(result.stdout)
    assert payload["ok"] is False
    assert payload["error"]["code"] == "command_failed"
    assert "definitely_not_a_ref_999" in payload["error"]["message"]


def test_the_json_alias_gets_the_same_envelope() -> None:
    result = _run(["sync", "read-doc", "definitely_not_a_ref_999", "--json"])
    assert result.returncode == 1
    assert json.loads(result.stdout)["ok"] is False


def test_text_failures_are_unchanged() -> None:
    result = _run(["sync", "read-doc", "definitely_not_a_ref_999"])
    assert result.returncode == 1
    assert result.stdout.strip() == "" or not result.stdout.strip().startswith("{")


@pytest.mark.parametrize(
    "args",
    [
        ["status", "--format", "json"],
        ["health", "--format", "json"],
        ["lint", "--format", "json"],
        ["sync", "list-docs", "--format", "json", "--limit", "1"],
    ],
)
def test_exit_code_agrees_with_the_success_flag(args: list[str]) -> None:
    result = _run(args)
    payload = json.loads(result.stdout)
    if isinstance(payload, dict) and "ok" in payload:
        assert (result.returncode == 0) == bool(payload["ok"]), payload
    else:
        assert result.returncode == 0


def test_a_failing_tool_call_reports_ok_false() -> None:
    result = _run(["mcp", "call", "definitely_not_a_tool", "--arguments", "{}"])
    assert result.returncode == 1
    assert json.loads(result.stdout)["ok"] is False
