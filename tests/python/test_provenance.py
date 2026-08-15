"""item_836: provenance answerable from data, not by grepping prose."""

from __future__ import annotations

from pathlib import Path

from logics_manager.provenance import (
    all_request_provenance,
    issue_number,
    request_issue_urls,
    requests_for_issue,
)


def _write_request(repo_root: Path, rel_path: str, *, provenance_lines: list[str] | None = None) -> None:
    path = repo_root / rel_path
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [f"## {path.stem} - Demo", "> Status: Draft", "", "# Needs", "- n"]
    if provenance_lines is not None:
        lines += ["", "# Provenance", *provenance_lines]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def test_issue_number_reads_a_url_a_hash_form_or_a_bare_number() -> None:
    assert issue_number("https://github.com/acme/demo/issues/20") == "20"
    assert issue_number("https://github.com/acme/demo/issues/20/") == "20"
    assert issue_number("#20") == "20"
    assert issue_number("20") == "20"
    assert issue_number("not an issue") is None


def test_request_issue_urls_is_empty_for_a_request_with_no_provenance(tmp_path: Path) -> None:
    """item_836 AC2: nothing, not an error."""
    _write_request(tmp_path, "logics/request/req_001_demo.md")
    assert request_issue_urls(tmp_path, "logics/request/req_001_demo.md") == []
    assert request_issue_urls(tmp_path, "logics/request/req_missing.md") == []


def test_request_issue_urls_reads_what_is_already_written(tmp_path: Path) -> None:
    """item_836 AC1: reads today's shape, the one create_request already writes."""
    _write_request(
        tmp_path,
        "logics/request/req_001_demo.md",
        provenance_lines=[
            "- Origin: `github`",
            "- Actor: `AlexAgo83`",
            "- External id: `#9`",
            "- External issue: https://github.com/AlexAgo83/logics-manager/issues/9",
            "- Approval: required before implementation starts.",
        ],
    )
    assert request_issue_urls(tmp_path, "logics/request/req_001_demo.md") == [
        "https://github.com/AlexAgo83/logics-manager/issues/9"
    ]


def test_request_issue_urls_reads_multiple_attached_issues(tmp_path: Path) -> None:
    """item_835 attaches a second issue by appending another bullet pair; the reader
    must see both, not just the first."""
    _write_request(
        tmp_path,
        "logics/request/req_001_demo.md",
        provenance_lines=[
            "- Origin: `github`",
            "- External id: `#20`",
            "- External issue: https://github.com/acme/demo/issues/20",
            "- External id: `#21`",
            "- External issue: https://github.com/acme/demo/issues/21",
            "- Approval: required before implementation starts.",
        ],
    )
    assert request_issue_urls(tmp_path, "logics/request/req_001_demo.md") == [
        "https://github.com/acme/demo/issues/20",
        "https://github.com/acme/demo/issues/21",
    ]


def test_all_request_provenance_skips_requests_with_none(tmp_path: Path) -> None:
    _write_request(tmp_path, "logics/request/req_001_none.md")
    _write_request(
        tmp_path,
        "logics/request/req_002_demo.md",
        provenance_lines=["- External issue: https://github.com/acme/demo/issues/5"],
    )
    assert all_request_provenance(tmp_path) == {"req_002_demo": ["https://github.com/acme/demo/issues/5"]}


def test_requests_for_issue_matches_by_url_hash_or_bare_number(tmp_path: Path) -> None:
    _write_request(
        tmp_path,
        "logics/request/req_357_demo.md",
        provenance_lines=[
            "- External issue: https://github.com/acme/demo/issues/20",
            "- External issue: https://github.com/acme/demo/issues/21",
        ],
    )
    assert requests_for_issue(tmp_path, "20") == ["req_357_demo"]
    assert requests_for_issue(tmp_path, "#21") == ["req_357_demo"]
    assert requests_for_issue(tmp_path, "https://github.com/acme/demo/issues/20") == ["req_357_demo"]
    assert requests_for_issue(tmp_path, "99") == []
