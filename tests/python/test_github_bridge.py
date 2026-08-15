"""item_834: the reconciliation report -- state only, never a body."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from logics_manager.github_bridge import closeout_notice_payload, reconciliation_report_payload


def _git_ok(url: str = "https://github.com/acme/demo.git\n"):
    def runner(args, **kwargs):
        assert args[:2] == ["git", "remote"]
        return subprocess.CompletedProcess(args, 0, url, "")
    return runner


def _write_request(repo_root: Path, ref: str, *, status: str, issue_urls: list[str] | None = None) -> None:
    path = repo_root / "logics" / "request" / f"{ref}.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [f"## {ref} - Demo", f"> Status: {status}", "", "# Needs", "- n"]
    if issue_urls:
        lines += ["", "# Provenance", "- Origin: `human`"]
        for url in issue_urls:
            lines.append(f"- External issue: {url}")
        lines.append("- Approval: required before implementation starts.")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def test_reconciliation_report_says_unreachable_with_no_github_remote(tmp_path: Path) -> None:
    """item_834 AC2: no network/no remote says so, rather than an empty disagreement."""
    def git_runner(args, **kwargs):
        return subprocess.CompletedProcess(args, 128, "", "fatal: no such remote 'origin'")

    payload = reconciliation_report_payload(tmp_path, git_runner=git_runner)
    assert payload["ok"] is False
    assert payload["reachable"] is False
    assert payload["message"]


def test_reconciliation_report_says_unreachable_when_gh_fails(tmp_path: Path) -> None:
    def gh_runner(args, **kwargs):
        return subprocess.CompletedProcess(args, 1, "", "gh: authentication required")

    payload = reconciliation_report_payload(tmp_path, git_runner=_git_ok(), gh_runner=gh_runner)
    assert payload["ok"] is False
    assert payload["reachable"] is False
    assert "authentication" in payload["message"]


def test_reconciliation_report_names_all_three_disagreements(tmp_path: Path) -> None:
    """item_834 AC1: each disagreement named separately, with issue numbers and refs."""
    _write_request(tmp_path, "req_001_done_open_issue", status="Done", issue_urls=["https://github.com/acme/demo/issues/20"])
    _write_request(tmp_path, "req_002_open_closed_issue", status="Ready", issue_urls=["https://github.com/acme/demo/issues/21"])
    _write_request(tmp_path, "req_003_settled_fine", status="Done", issue_urls=["https://github.com/acme/demo/issues/22"])

    issues = [
        {"number": 20, "state": "OPEN", "labels": [{"name": "logics:delivered"}], "url": "https://github.com/acme/demo/issues/20"},
        {"number": 21, "state": "CLOSED", "labels": [], "url": "https://github.com/acme/demo/issues/21"},
        {"number": 22, "state": "CLOSED", "labels": [{"name": "logics:delivered"}], "url": "https://github.com/acme/demo/issues/22"},
        {"number": 30, "state": "OPEN", "labels": [], "url": "https://github.com/acme/demo/issues/30"},
    ]

    calls = []

    def gh_runner(args, **kwargs):
        calls.append(args)
        return subprocess.CompletedProcess(args, 0, json.dumps(issues), "")

    payload = reconciliation_report_payload(tmp_path, git_runner=_git_ok(), gh_runner=gh_runner)

    assert payload["ok"] is True
    assert payload["open_issues_with_no_request"] == [{"issue": "30", "url": "https://github.com/acme/demo/issues/30"}]
    assert payload["done_requests_with_open_issues"] == [
        {"issue": "20", "url": "https://github.com/acme/demo/issues/20", "request": "req_001_done_open_issue", "request_status": "done"}
    ]
    assert payload["closed_issues_with_open_request"] == [
        {"issue": "21", "url": "https://github.com/acme/demo/issues/21", "request": "req_002_open_closed_issue", "request_status": "ready"}
    ]
    # req_003 is settled and its issue is closed -- no disagreement, nothing reported.
    all_issue_numbers = {entry["issue"] for group in ("open_issues_with_no_request", "done_requests_with_open_issues", "closed_issues_with_open_request") for entry in payload[group]}
    assert "22" not in all_issue_numbers

    # item_834 AC3: never a body. The gh call requested only number/state/labels/url.
    assert len(calls) == 1
    json_arg = calls[0][calls[0].index("--json") + 1]
    assert "body" not in json_arg.split(",")


def test_closeout_notice_states_what_would_be_posted_by_default(tmp_path: Path) -> None:
    """item_837 AC1/AC2: finishing a request that names issues reports which issues
    would be told and what would be said; nothing is posted without an explicit action."""
    _write_request(
        tmp_path,
        "req_357_demo",
        status="Done",
        issue_urls=["https://github.com/acme/demo/issues/20", "https://github.com/acme/demo/issues/21"],
    )

    def gh_runner(args, **kwargs):
        raise AssertionError("gh must not be invoked when post is not requested")

    payload = closeout_notice_payload(tmp_path, "req_357_demo", state="delivered", gh_runner=gh_runner)

    assert payload["ok"] is True
    assert payload["posted"] is False
    assert len(payload["notices"]) == 2
    assert payload["notices"][0]["label"] == "logics:delivered"
    # item_837 AC3: the exact wording .github/workflows/logics-issue-update.yml posts.
    assert payload["notices"][0]["comment"] == "Logics lifecycle update: **delivered** — linked workflow: `req_357_demo`."


def test_closeout_notice_posts_only_when_explicitly_asked(tmp_path: Path) -> None:
    _write_request(tmp_path, "req_357_demo", status="Done", issue_urls=["https://github.com/acme/demo/issues/20"])

    calls = []

    def gh_runner(args, **kwargs):
        calls.append(args)
        return subprocess.CompletedProcess(args, 0, "", "")

    payload = closeout_notice_payload(tmp_path, "req_357_demo", state="delivered", post=True, gh_runner=gh_runner)

    assert payload["ok"] is True
    assert payload["posted"] is True
    assert payload["posted_issues"] == ["https://github.com/acme/demo/issues/20"]
    assert calls == [
        ["gh", "issue", "edit", "https://github.com/acme/demo/issues/20", "--add-label", "logics:delivered"],
        ["gh", "issue", "comment", "https://github.com/acme/demo/issues/20", "--body", "Logics lifecycle update: **delivered** — linked workflow: `req_357_demo`."],
    ]


def test_closeout_notice_reports_a_failed_post_without_raising(tmp_path: Path) -> None:
    _write_request(tmp_path, "req_357_demo", status="Done", issue_urls=["https://github.com/acme/demo/issues/20"])

    def gh_runner(args, **kwargs):
        return subprocess.CompletedProcess(args, 1, "", "gh: issue not found")

    payload = closeout_notice_payload(tmp_path, "req_357_demo", state="delivered", post=True, gh_runner=gh_runner)

    assert payload["ok"] is False
    assert payload["posted"] is False
    assert payload["errors"][0]["issue_url"] == "https://github.com/acme/demo/issues/20"
    assert "issue not found" in payload["errors"][0]["error"]


def test_closeout_notice_rejects_an_unsupported_lifecycle_state(tmp_path: Path) -> None:
    _write_request(tmp_path, "req_357_demo", status="Done", issue_urls=["https://github.com/acme/demo/issues/20"])
    with pytest.raises(ValueError):
        closeout_notice_payload(tmp_path, "req_357_demo", state="bogus")
