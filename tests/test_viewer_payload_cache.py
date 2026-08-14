"""Regression tests for item_781 and item_783: the viewer stops rebuilding an unchanged corpus.

The defect these exist to prevent is not slowness in the abstract. It is that a viewer
left running answered in 38s where a fresh one answered in 6s, and that several sessions
were spent raising the visual campaign's timeouts because the failure surfaced there as
"Timed out waiting for cards" rather than as a server that had stopped keeping up.

Both halves are covered, because a cache that is fast and wrong is worse than no cache:
the work must not be repeated for an unchanged corpus, and a change on disk must appear.
"""
from __future__ import annotations

import time
from pathlib import Path

import pytest

from logics_manager import viewer_docs


@pytest.fixture
def corpus(tmp_path: Path) -> Path:
    request_dir = tmp_path / "logics" / "request"
    request_dir.mkdir(parents=True)
    for index in range(3):
        (request_dir / f"req_{index:03d}_probe.md").write_text(
            f"## req_{index:03d}_probe - Probe {index}\n> Status: Draft\n\n# Needs\n- Something.\n",
            encoding="utf-8",
        )
    # Each test starts from a cache that knows nothing about this corpus.
    viewer_docs._ITEMS_CACHE.update({"root": None, "signature": None, "items": None})
    return tmp_path


def test_an_unchanged_corpus_is_not_rebuilt(corpus: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Counted, not timed: a timing assertion is a flaky assertion on a busy machine."""
    calls = 0
    original = viewer_docs._collect_viewer_items_uncached

    def counting(repo_root: Path):
        nonlocal calls
        calls += 1
        return original(repo_root)

    monkeypatch.setattr(viewer_docs, "_collect_viewer_items_uncached", counting)

    first = viewer_docs.collect_viewer_items(corpus)
    second = viewer_docs.collect_viewer_items(corpus)
    third = viewer_docs.collect_viewer_items(corpus)

    assert calls == 1, "an unchanged corpus was parsed more than once"
    assert [item["id"] for item in first] == [item["id"] for item in second] == [item["id"] for item in third]


def test_a_change_on_disk_appears_in_the_next_payload(corpus: Path) -> None:
    """AC3. A cache that serves a corpus the operator no longer has is worse than a slow one."""
    before = viewer_docs.collect_viewer_items(corpus)
    assert len(before) == 3

    # A whole new document, which changes the count.
    (corpus / "logics" / "request" / "req_009_added.md").write_text(
        "## req_009_added - Added\n> Status: Draft\n\n# Needs\n- Added later.\n", encoding="utf-8"
    )
    after = viewer_docs.collect_viewer_items(corpus)
    assert len(after) == 4
    assert "req_009_added" in {item["id"] for item in after}


def test_an_edit_that_keeps_the_byte_count_still_appears(corpus: Path) -> None:
    """The case a count-and-size signature alone would miss.

    An edit replacing one character for another keeps the file size, so the signature
    leans on mtime for this one -- which is why it carries both.
    """
    target = corpus / "logics" / "request" / "req_000_probe.md"
    before = viewer_docs.collect_viewer_items(corpus)
    assert any(item["title"] == "Probe 0" for item in before)

    # Same length, different content. Slept past the filesystem's timestamp resolution:
    # without this the edit and the first read can land in one tick on a coarse filesystem,
    # and the test would assert something the signature cannot see.
    time.sleep(1.05)
    target.write_text(target.read_text(encoding="utf-8").replace("Probe 0", "Probe X"), encoding="utf-8")

    after = viewer_docs.collect_viewer_items(corpus)
    assert any(item["title"] == "Probe X" for item in after)


def test_a_deleted_document_disappears(corpus: Path) -> None:
    assert len(viewer_docs.collect_viewer_items(corpus)) == 3
    (corpus / "logics" / "request" / "req_000_probe.md").unlink()
    assert len(viewer_docs.collect_viewer_items(corpus)) == 2


def test_a_caller_cannot_corrupt_the_cache(corpus: Path) -> None:
    """Callers annotate what they are handed, so they are handed their own copy.

    Without this one request's `selected` flag leaks into the next request's payload,
    which is the class of bug a shared cache is most likely to introduce.
    """
    first = viewer_docs.collect_viewer_items(corpus)
    first[0]["selected"] = True
    first.clear()

    second = viewer_docs.collect_viewer_items(corpus)
    assert len(second) == 3
    assert all("selected" not in item for item in second)


def test_switching_repository_does_not_serve_the_previous_one(corpus: Path, tmp_path_factory) -> None:
    """A fleet operator switches projects; the cache holds one repository at a time."""
    other = tmp_path_factory.mktemp("other")
    other_requests = other / "logics" / "request"
    other_requests.mkdir(parents=True)
    (other_requests / "req_100_elsewhere.md").write_text(
        "## req_100_elsewhere - Elsewhere\n> Status: Draft\n\n# Needs\n- Different repository.\n",
        encoding="utf-8",
    )

    assert len(viewer_docs.collect_viewer_items(corpus)) == 3
    assert {item["id"] for item in viewer_docs.collect_viewer_items(other)} == {"req_100_elsewhere"}
    assert len(viewer_docs.collect_viewer_items(corpus)) == 3
