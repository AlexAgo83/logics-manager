"""The several document models must agree, or fail loudly.

Six independent implementations parse the same workflow documents into six
different models: insights, audit, sync, index, the viewer, and the editor
extension's own indexer. They serve different callers and merging them would be
a large change against a risk that, measured, is not yet real -- they agree
exactly today on which documents exist and on their statuses.

Where it HAS gone wrong is the derived fields: one age computation existed three
times over filesystem mtime, and two staleness thresholds disagreed across
surfaces (thirty days against a configurable fourteen). Those are now shared, so
this file guards both: that the models still agree, and that the shared
derivations have not been re-forked.

A detector, not a refactor. When it fails, it names who disagrees about what.
"""

from __future__ import annotations

import itertools
from pathlib import Path

import pytest

from logics_manager.audit import _collect_docs
from logics_manager.config import holds_corpus
from logics_manager.doc_parsing import age_in_days, last_change_time
from logics_manager.index import _parse_doc as index_parse_doc
from logics_manager.insights import collect_logics_docs
from logics_manager.sync import _load_workflow_docs
from logics_manager.viewer_docs import collect_viewer_items

REPO_ROOT = Path(__file__).resolve().parents[2]


def _models(root: Path) -> dict[str, dict[str, str]]:
    """model name -> {ref: status}, for every model that exposes both."""
    return {
        "insights": {doc.ref: (doc.status or "").strip() for doc in collect_logics_docs(root)},
        "sync": {
            doc.ref: doc.indicators.get("Status", "").strip()
            for doc in _load_workflow_docs(root).values()
        },
        "viewer": {
            str(item["id"]): str(item["indicators"].get("Status") or "").strip()
            for item in collect_viewer_items(root)
        },
    }


def _describe(missing: set[str], limit: int = 5) -> str:
    listed = ", ".join(sorted(missing)[:limit])
    more = f" (+{len(missing) - limit} more)" if len(missing) > limit else ""
    return listed + more


def find_disagreements(models: dict[str, dict[str, str]]) -> list[str]:
    """Every way the models disagree, named. Empty means they are consistent."""
    problems: list[str] = []
    for (left_name, left), (right_name, right) in itertools.combinations(sorted(models.items()), 2):
        only_left = set(left) - set(right)
        only_right = set(right) - set(left)
        if only_left:
            problems.append(f"{left_name} sees documents {right_name} does not: {_describe(only_left)}")
        if only_right:
            problems.append(f"{right_name} sees documents {left_name} does not: {_describe(only_right)}")
        clashes = {
            ref: (left[ref], right[ref])
            for ref in left
            if ref in right and left[ref] and right[ref] and left[ref] != right[ref]
        }
        if clashes:
            problems.append(
                f"{left_name} and {right_name} disagree on {len(clashes)} status(es): "
                + "; ".join(f"{ref}: {a!r} vs {b!r}" for ref, (a, b) in list(clashes.items())[:3])
            )
    return problems


def test_the_models_agree() -> None:
    models = _models(REPO_ROOT)
    models["audit"] = dict.fromkeys(_collect_docs(REPO_ROOT), "")
    problems = find_disagreements(models)
    assert not problems, "\n".join(problems)


def test_a_missing_document_is_detected() -> None:
    """The detector must fail on drift, not quietly pass."""
    models = _models(REPO_ROOT)
    dropped = sorted(models["sync"])[0]
    del models["insights"][dropped]
    problems = find_disagreements(models)
    assert problems, "a document dropped from one model went undetected"
    assert any(dropped in problem for problem in problems), problems


def test_a_status_disagreement_is_detected() -> None:
    models = _models(REPO_ROOT)
    ref = next(key for key, value in models["sync"].items() if value)
    models["viewer"][ref] = "Wildly Different"
    problems = find_disagreements(models)
    assert problems, "a status disagreement went undetected"
    assert any(ref in problem for problem in problems), problems


# ---- the derived fields, which is where it has already gone wrong ----


def test_document_age_is_derived_in_one_place() -> None:
    """The viewer must not re-derive an age the shared helper already computes."""
    items = collect_viewer_items(REPO_ROOT)
    sample = [item for item in items if item.get("updatedAt")][:25]
    assert sample, "no dated documents to compare"
    for item in sample:
        shared = age_in_days(last_change_time(REPO_ROOT, str(item["relPath"])))
        assert item["ageDays"] == shared, (
            f"{item['id']}: viewer reports {item['ageDays']} days, shared helper reports {shared}"
        )


def test_the_corpus_check_is_shared() -> None:
    """Every caller must route through one definition of "holds a corpus"."""
    from logics_manager import fleet, mcp, viewer

    for module in (fleet, viewer, mcp):
        assert getattr(module, "holds_corpus", None) is holds_corpus, (
            f"{module.__name__} carries its own corpus check"
        )


def test_index_entries_match_the_shared_parser() -> None:
    """The index builds its own entry type; its refs must still line up."""
    root = REPO_ROOT / "logics" / "request"
    paths = sorted(root.glob("req_*.md"))[:20]
    assert paths, "no request documents to compare"
    sync_docs = _load_workflow_docs(REPO_ROOT)
    for path in paths:
        entry = index_parse_doc(path)
        ref = getattr(entry, "ref", None) or path.stem
        assert ref in sync_docs, f"index sees {ref}, the shared parser does not"
