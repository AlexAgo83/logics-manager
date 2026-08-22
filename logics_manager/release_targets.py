from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from .config import ConfigError


@dataclass(frozen=True)
class ReleaseTarget:
    id: str | None
    contract: dict[str, Any]


def target_evidence(evidence: list[dict[str, Any]], target_id: str | None) -> list[dict[str, Any]]:
    if target_id is None:
        return [entry for entry in evidence if "target_id" not in entry]
    return [entry for entry in evidence if entry.get("target_id") == target_id]


def release_targets(contract: dict[str, Any], selected: str | None = None, *, require_selected: bool = False) -> list[ReleaseTarget]:
    raw_targets = contract.get("targets")
    if raw_targets is None:
        if selected:
            raise ConfigError("Release target selection is only supported by multi-target contracts.")
        return [ReleaseTarget(None, contract)]
    if not isinstance(raw_targets, list) or not raw_targets:
        raise ConfigError("Multi-target release contracts require a non-empty targets array.")

    seen: set[str] = set()
    targets: list[ReleaseTarget] = []
    for raw in raw_targets:
        if not isinstance(raw, dict):
            raise ConfigError("Each release target must be a JSON object.")
        target_id = raw.get("id")
        if not isinstance(target_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,63}", target_id):
            raise ConfigError(f"Unsafe release target id: {target_id!r}")
        if target_id in seen:
            raise ConfigError(f"Duplicate release target id: {target_id}")
        seen.add(target_id)
        for gate in raw.get("gates_excluded", []) if isinstance(raw.get("gates_excluded"), list) else []:
            if not isinstance(gate, dict) or not str(gate.get("id") or "").strip() or not str(gate.get("reason") or "").strip():
                raise ConfigError(f"Release target {target_id} has an excluded gate without a non-empty reason.")
        merged = _target_overlay(contract, raw)
        if not isinstance(merged.get("version_sources"), list) or not merged["version_sources"]:
            raise ConfigError(f"Release target {target_id} must declare version_sources.")
        if not isinstance(merged.get("gates"), list) or not merged["gates"]:
            raise ConfigError(f"Release target {target_id} must declare gates.")
        git = merged.get("git") if isinstance(merged.get("git"), dict) else {}
        tag_policy = git.get("tag_policy") if isinstance(git.get("tag_policy"), dict) else {}
        if not isinstance(tag_policy.get("pattern"), str) or not tag_policy["pattern"]:
            raise ConfigError(f"Release target {target_id} must declare git.tag_policy.pattern.")
        targets.append(ReleaseTarget(target_id, merged))

    if selected is None:
        if require_selected:
            raise ConfigError("Multi-target release contracts require --target.")
        return targets
    for target in targets:
        if target.id == selected:
            return [target]
    raise ConfigError(f"Unknown release target: {selected}")


def _target_overlay(contract: dict[str, Any], target: dict[str, Any]) -> dict[str, Any]:
    merged = {key: value for key, value in contract.items() if key != "targets"}
    for key in (
        "version_sources",
        "changelog",
        "release_notes",
        "gates",
        "validation_commands",
        "git",
        "github_release",
        "external_publication",
    ):
        if key in target:
            merged[key] = target[key]
    return merged
