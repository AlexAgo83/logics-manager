"""Document listings must carry an age, and health must flag stale docs.

Listings exposed no timestamp at all, so a watchdog looking for forgotten
drafts ran one version-control lookup per document to date it, and applied its
own hardcoded staleness threshold — a judgement that belongs to the corpus.
"""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

import pytest

from logics_manager import doc_parsing
from logics_manager.doc_parsing import age_in_days, git_last_change_times, last_change_time
from logics_manager.insights import health_payload
from logics_manager.sync import list_logics_docs_payload, read_logics_doc_payload

REPO_ROOT = Path(__file__).resolve().parents[2]

DOC_TEMPLATE = """## {ref} - {title}
> Schema version: 1.0
> Status: {status}
> Understanding: 50%
> Confidence: 50%
> Progress: 0%

# Needs
- Something.
"""


@pytest.fixture(autouse=True)
def _clear_cache():
    doc_parsing._LAST_CHANGE_CACHE.clear()
    yield
    doc_parsing._LAST_CHANGE_CACHE.clear()


def _git(args: list[str], cwd: Path) -> None:
    subprocess.run(["git", *args], cwd=cwd, check=True, timeout=60, capture_output=True)


@pytest.fixture
def corpus(tmp_path: Path) -> Path:
    root = tmp_path / "corpus"
    root.mkdir()
    _git(["init", "-q"], root)
    _git(["config", "user.email", "test@example.invalid"], root)
    _git(["config", "user.name", "Test"], root)
    subprocess.run(
        [sys.executable, "-m", "logics_manager", "bootstrap", "--repo-root", str(root)],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=60, check=True,
    )
    return root


def _write_doc(root: Path, directory: str, ref: str, status: str = "Draft") -> str:
    target = root / "logics" / directory
    target.mkdir(parents=True, exist_ok=True)
    path = target / f"{ref}.md"
    path.write_text(DOC_TEMPLATE.format(ref=ref, title=ref, status=status), encoding="utf-8")
    return path.relative_to(root).as_posix()


def _commit(root: Path, message: str, *, days_ago: int = 0) -> None:
    stamp = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(time.time() - days_ago * 86400))
    env_date = f"{stamp}"
    _git(["add", "-A"], root)
    subprocess.run(
        ["git", "commit", "-q", "-m", message],
        cwd=root,
        check=True,
        timeout=60,
        capture_output=True,
        env={
            "PATH": "/usr/bin:/bin:/usr/local/bin",
            "HOME": str(root),
            "GIT_AUTHOR_DATE": env_date,
            "GIT_COMMITTER_DATE": env_date,
            "GIT_AUTHOR_NAME": "Test",
            "GIT_AUTHOR_EMAIL": "test@example.invalid",
            "GIT_COMMITTER_NAME": "Test",
            "GIT_COMMITTER_EMAIL": "test@example.invalid",
        },
    )


# ---- age fields ----


def test_list_docs_reports_updated_at_and_age(corpus: Path) -> None:
    _write_doc(corpus, "request", "req_001_recent")
    _commit(corpus, "add request")
    payload = list_logics_docs_payload(corpus)
    item = next(entry for entry in payload["items"] if entry["ref"] == "req_001_recent")
    assert isinstance(item["updated_at"], int)
    assert item["age_days"] == 0


def test_read_doc_reports_updated_at_and_age(corpus: Path) -> None:
    path = _write_doc(corpus, "request", "req_002_readable")
    _commit(corpus, "add request")
    payload = read_logics_doc_payload(corpus, "req_002_readable")
    assert isinstance(payload["updated_at"], int)
    assert payload["age_days"] == 0
    assert payload["path"] == path


def test_age_comes_from_the_commit_not_the_checkout(corpus: Path) -> None:
    """A fresh clone gives every file the same mtime; the commit date is the truth."""
    _write_doc(corpus, "request", "req_003_old")
    _commit(corpus, "add old request", days_ago=40)
    times = git_last_change_times(corpus)
    stamp = last_change_time(corpus, "logics/request/req_003_old.md", times)
    assert age_in_days(stamp) >= 39


def test_untracked_doc_falls_back_to_filesystem_mtime(corpus: Path) -> None:
    _write_doc(corpus, "request", "req_004_untracked")
    payload = list_logics_docs_payload(corpus)
    item = next(entry for entry in payload["items"] if entry["ref"] == "req_004_untracked")
    assert item["updated_at"] is not None, "an uncommitted doc reported no date at all"
    assert item["age_days"] == 0


def test_a_repository_without_git_still_lists(tmp_path: Path) -> None:
    root = tmp_path / "nogit"
    root.mkdir()
    subprocess.run(
        [sys.executable, "-m", "logics_manager", "bootstrap", "--repo-root", str(root)],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=60, check=True,
    )
    _write_doc(root, "request", "req_005_nogit")
    payload = list_logics_docs_payload(root)
    item = next(entry for entry in payload["items"] if entry["ref"] == "req_005_nogit")
    assert item["age_days"] == 0


# ---- stale signal ----


def test_health_reports_stale_open_docs(corpus: Path) -> None:
    _write_doc(corpus, "request", "req_010_forgotten")
    _commit(corpus, "add forgotten request", days_ago=40)
    payload = health_payload(corpus)
    assert payload["stale_after_days"] == 14
    refs = {entry["ref"] for entry in payload["stale_docs"]}
    assert "req_010_forgotten" in refs


def test_recent_docs_are_not_stale(corpus: Path) -> None:
    _write_doc(corpus, "request", "req_011_fresh")
    _commit(corpus, "add fresh request")
    payload = health_payload(corpus)
    assert payload["stale_doc_count"] == 0


def test_closed_docs_are_never_stale(corpus: Path) -> None:
    _write_doc(corpus, "request", "req_012_closed", status="Done")
    _commit(corpus, "add closed request", days_ago=90)
    payload = health_payload(corpus)
    assert all(entry["ref"] != "req_012_closed" for entry in payload["stale_docs"])


def test_threshold_is_configurable(corpus: Path) -> None:
    _write_doc(corpus, "request", "req_013_borderline")
    _commit(corpus, "add borderline request", days_ago=20)
    assert health_payload(corpus)["stale_doc_count"] == 1

    (corpus / "logics.yaml").write_text("health:\n  stale_after_days: 30\n", encoding="utf-8")
    assert health_payload(corpus)["stale_doc_count"] == 0


def test_stale_docs_stay_out_of_the_issue_count(corpus: Path) -> None:
    """Age is a nudge, not a correctness problem; it must not flip `ok`."""
    _write_doc(corpus, "request", "req_014_old", status="Draft")
    _commit(corpus, "add old request", days_ago=60)
    payload = health_payload(corpus)
    assert payload["stale_doc_count"] == 1
    assert payload["issue_count"] == 0
    assert payload["ok"] is True


def test_stale_docs_are_sorted_oldest_first(corpus: Path) -> None:
    _write_doc(corpus, "request", "req_020_older")
    _commit(corpus, "older", days_ago=90)
    _write_doc(corpus, "request", "req_021_newer")
    _commit(corpus, "newer", days_ago=30)
    ages = [entry["age_days"] for entry in health_payload(corpus)["stale_docs"]]
    assert ages == sorted(ages, reverse=True)


# ---- the batched lookup ----


def test_change_times_are_read_in_one_pass(corpus: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """One git walk for the whole subtree, not one per document."""
    for index in range(5):
        _write_doc(corpus, "request", f"req_03{index}_batch")
    _commit(corpus, "add five requests")
    doc_parsing._LAST_CHANGE_CACHE.clear()

    calls: list[list[str]] = []
    real_run = subprocess.run

    def counting_run(command, *args, **kwargs):
        if isinstance(command, list) and command[:2] == ["git", "log"]:
            calls.append(command)
        return real_run(command, *args, **kwargs)

    monkeypatch.setattr(doc_parsing.subprocess, "run", counting_run)
    payload = list_logics_docs_payload(corpus)
    assert len([item for item in payload["items"] if item["ref"].endswith("_batch")]) == 5
    assert len(calls) == 1, f"expected one git log walk, got {len(calls)}"
