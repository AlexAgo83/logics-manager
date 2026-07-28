"""Single source of truth for workflow/companion statuses.

Loads ``statuses.json`` (shipped with the package) so Python and TypeScript
agree on the allowed statuses, the closed set, and which transitions are legal.
The TypeScript side consumes the generated ``workflowStatuses.generated.ts``;
a ``--check`` lint guard fails CI if it drifts from this JSON.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_STATUSES_PATH = Path(__file__).with_name("statuses.json")


@lru_cache(maxsize=1)
def _data() -> dict[str, object]:
    return json.loads(_STATUSES_PATH.read_text(encoding="utf-8"))


def stage_statuses(stage: str) -> tuple[str, ...]:
    """Allowed statuses for a stage, in canonical order."""
    stages = _data()["stages"]
    return tuple(stages.get(stage, ()))  # type: ignore[union-attr]


def all_stage_statuses() -> dict[str, tuple[str, ...]]:
    return {stage: tuple(values) for stage, values in _data()["stages"].items()}  # type: ignore[union-attr]


@lru_cache(maxsize=1)
def open_statuses() -> frozenset[str]:
    return frozenset(_data()["open"])  # type: ignore[arg-type]


@lru_cache(maxsize=1)
def closed_statuses() -> frozenset[str]:
    return frozenset(_data()["closed"])  # type: ignore[arg-type]


@lru_cache(maxsize=1)
def terminal_statuses() -> frozenset[str]:
    return frozenset(_data()["terminal"])  # type: ignore[arg-type]


@lru_cache(maxsize=1)
def workflow_statuses() -> tuple[str, ...]:
    """Union of statuses across the request/backlog/task stages, ordered."""
    seen: list[str] = []
    for stage in ("request", "backlog", "task"):
        for value in stage_statuses(stage):
            if value not in seen:
                seen.append(value)
    return tuple(seen)


def canonical_status(stage: str, value: str) -> str:
    """Return the canonical status label for common casing/separator aliases."""
    cleaned = " ".join(value.replace("_", " ").replace("-", " ").split()).lower()
    for status in stage_statuses(stage):
        if " ".join(status.replace("_", " ").replace("-", " ").split()).lower() == cleaned:
            return status
    return value


def transition_error(stage: str, previous: str | None, target: str) -> str | None:
    """Return a human-readable error if the transition is illegal, else None.

    The state machine is deliberately lenient: any status valid for the stage is
    reachable, except that a terminal status (e.g. Archived) cannot transition to
    a different status.
    ponytail: membership + terminal rule; add per-status edges if a workflow needs them.
    """
    allowed = stage_statuses(stage)
    target = canonical_status(stage, target)
    if allowed and target not in allowed:
        return f"`{target}` is not a valid status for {stage} (allowed: {', '.join(allowed)})."
    prev = (previous or "").strip()
    if prev and prev != target and prev in terminal_statuses():
        return f"`{prev}` is terminal; cannot transition to `{target}`."
    return None
