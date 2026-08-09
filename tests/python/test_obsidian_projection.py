"""req_319: the Obsidian projection must produce real graph edges.

Before this, `obsidian sync` wrote deterministic frontmatter but copied the
body verbatim, so plain backtick-quoted refs (`req_318_x`) never became
`[[wikilink]]`s and every synced doc landed as an isolated node in Obsidian's
graph view. No test file exercised this projection's behavior directly.
"""

from __future__ import annotations

from pathlib import Path

from logics_manager.obsidian import obsidian_payload


def _write_repo(root: Path, *, enabled: bool = True) -> None:
    (root / "logics.yaml").write_text(f"obsidian:\n  enabled: {str(enabled).lower()}\n", encoding="utf-8")
    (root / "logics" / "request").mkdir(parents=True)
    (root / "logics" / "backlog").mkdir(parents=True)
    (root / "logics" / "request" / "req_001_demo.md").write_text(
        "\n".join(
            [
                "## req_001_demo - Demo",
                "> Status: Draft",
                "",
                "# Context",
                "- Mentioned only in prose: item_999_not_a_real_doc, and this looks like a ref too: `item_999_not_a_real_doc`.",
                "",
                "# Backlog",
                "- `item_001_slice`",
                "",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (root / "logics" / "backlog" / "item_001_slice.md").write_text(
        "\n".join(
            [
                "## item_001_slice - Slice",
                "> Status: Ready",
                "",
                "# Links",
                "- Request: `req_001_demo`",
                "",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def test_sync_converts_a_real_ref_to_a_wikilink(tmp_path: Path) -> None:
    _write_repo(tmp_path)
    obsidian_payload(tmp_path, action="sync")
    request_text = (tmp_path / "logics" / "request" / "req_001_demo.md").read_text(encoding="utf-8")
    assert "[[item_001_slice]]" in request_text
    backlog_text = (tmp_path / "logics" / "backlog" / "item_001_slice.md").read_text(encoding="utf-8")
    assert "[[req_001_demo]]" in backlog_text


def test_sync_never_links_a_ref_that_is_not_a_real_doc(tmp_path: Path) -> None:
    """The req_319/item_649 case found while scoping this request: a ref
    mentioned only as a prose example must never produce a wikilink."""
    _write_repo(tmp_path)
    obsidian_payload(tmp_path, action="sync")
    request_text = (tmp_path / "logics" / "request" / "req_001_demo.md").read_text(encoding="utf-8")
    assert "[[item_999_not_a_real_doc]]" not in request_text
    assert "`item_999_not_a_real_doc`" in request_text


def test_sync_is_idempotent(tmp_path: Path) -> None:
    _write_repo(tmp_path)
    obsidian_payload(tmp_path, action="sync")
    after_first = (tmp_path / "logics" / "request" / "req_001_demo.md").read_text(encoding="utf-8")
    second = obsidian_payload(tmp_path, action="sync")
    assert second["changed"] == []
    assert (tmp_path / "logics" / "request" / "req_001_demo.md").read_text(encoding="utf-8") == after_first


def test_clean_restores_the_canonical_body_byte_for_byte(tmp_path: Path) -> None:
    _write_repo(tmp_path)
    before = (tmp_path / "logics" / "request" / "req_001_demo.md").read_text(encoding="utf-8")
    obsidian_payload(tmp_path, action="sync")
    obsidian_payload(tmp_path, action="clean")
    after = (tmp_path / "logics" / "request" / "req_001_demo.md").read_text(encoding="utf-8")
    assert after == before


def test_check_mode_reports_wikilink_drift(tmp_path: Path) -> None:
    _write_repo(tmp_path)
    obsidian_payload(tmp_path, action="sync")
    # Simulate drift: hand-revert one wikilink back to a plain backtick ref,
    # as if the projected file had been committed stale.
    path = tmp_path / "logics" / "request" / "req_001_demo.md"
    path.write_text(path.read_text(encoding="utf-8").replace("[[item_001_slice]]", "`item_001_slice`"), encoding="utf-8")
    result = obsidian_payload(tmp_path, action="sync", check=True)
    assert result["ok"] is False
    assert "logics/request/req_001_demo.md" in result["changed"]


def test_sync_skipped_when_not_enabled(tmp_path: Path) -> None:
    _write_repo(tmp_path, enabled=False)
    result = obsidian_payload(tmp_path, action="sync")
    assert result["skipped_reason"]
    request_text = (tmp_path / "logics" / "request" / "req_001_demo.md").read_text(encoding="utf-8")
    assert "logics_projection" not in request_text
