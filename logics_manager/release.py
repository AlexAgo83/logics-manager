from __future__ import annotations

import contextlib
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import ConfigError, find_repo_root
from .cli_output import render_payload
from .release_cli_support import (
    release_parser,
    release_main_help,
    release_subcommand_help,
    render_release_discover,
    render_release_evidence_add,
    render_release_evidence_reset,
    render_release_plan,
    render_release_status,
    render_release_validate,
)
from .release_targets import release_targets, target_evidence


try:
    import fcntl
except ImportError:  # pragma: no cover - platform fallback
    fcntl = None  # type: ignore[assignment]


CONTRACT_PATH = Path("logics/release/contract.json")
DISCOVERY_DRAFT_PATH = Path("logics/release/contract.draft.json")
GIT_COMMAND_TIMEOUT_SECONDS = 15
DEFAULT_STATE_MACHINE = [
    "planning",
    "preparing",
    "local_validation",
    "commit_ready",
    "pushed",
    "ci_verification",
    "github_release",
    "external_publication",
    "ready",
    "blocked",
]
GATE_STATUSES = {"pending", "passed", "failed", "stale", "skipped", "not_configured", "blocked"}
SOURCE_EVIDENCE_KINDS = {"command", "file", "git", "ci"}
PUBLICATION_EVIDENCE_KINDS = {"github_release", "external"}
EVIDENCE_KINDS = {"command", "file", "git", "ci", "github_release", "external"}
GATE_COMPARISONS = {"branch", "release"}
DEFAULT_GATE_COMPARISON = "release"
DISCOVERY_OPERATOR_INTENTS = [
    {
        "utterance": "prepare release",
        "boundary": "Prepare metadata, changelog, and validation evidence only. Do not tag, push, publish, upload assets, or create a GitHub release unless explicitly requested.",
        "publication_action": False,
    },
    {
        "utterance": "commit and push, fix if CI is not green",
        "boundary": "Push first, then inspect the real remote CI run for the exact pushed commit before making fixes.",
        "publication_action": False,
    },
    {
        "utterance": "publish release",
        "boundary": "Publish only after required local and remote gates are green, then verify downstream publication or deployment evidence.",
        "publication_action": True,
    },
]
DISCOVERY_MISSING_CONTRACT = {
    "draft_path": {"path": DISCOVERY_DRAFT_PATH.as_posix(), "format": "json", "required": False},
    "local_first": True,
    "neighbor_projects_allowed": True,
    "local_sources": [
        {"path": "LOGICS.md", "required": False},
        {"path": "README.md", "required": False},
        {"path": "package.json", "required": False},
        {"path": "pyproject.toml", "required": False},
        {"path": ".github/workflows/", "required": False},
        {"path": "changelogs/", "required": False},
        {"path": "VERSION", "required": False},
        {"path": "checksums/", "required": False},
    ],
    "assistant_rule": "Infer this draft from local repository signals first. Use neighboring projects only as comparison evidence after local surfaces have been inspected.",
}


def release_evidence_add_example(gate_id: str = "<gate>") -> str:
    return (
        "logics-manager release evidence add "
        f"{gate_id} --kind command --status passed --summary \"<evidence summary>\" "
        "--target-version <version> --commit <sha>"
    )


@dataclass(frozen=True)
class ReleaseContext:
    repo_root: Path
    contract_path: Path
    contract: dict[str, Any] | None


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _rel(path: Path, repo_root: Path) -> str:
    try:
        return path.relative_to(repo_root).as_posix()
    except ValueError:
        return path.as_posix()


def _read_json(path: Path, *, label: str) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ConfigError(f"Missing {label}: {_rel(path, path.parents[2] if len(path.parents) > 2 else path.parent)}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"Invalid JSON in {_rel(path, path.parents[2] if len(path.parents) > 2 else path.parent)}: {exc}") from exc
    if not isinstance(payload, dict):
        raise ConfigError(f"{label} must be a JSON object.")
    return payload


def load_release_context(repo_root: Path) -> ReleaseContext:
    path = repo_root / CONTRACT_PATH
    if not path.is_file():
        return ReleaseContext(repo_root=repo_root, contract_path=path, contract=None)
    return ReleaseContext(repo_root=repo_root, contract_path=path, contract=_read_json(path, label="release contract"))


def _not_configured_payload(repo_root: Path) -> dict[str, Any]:
    return {
        "ok": False,
        "configured": False,
        "state": "not_configured",
        "target_version": None,
        "contract_path": CONTRACT_PATH.as_posix(),
        "gates": [],
        "blocking_reasons": [f"Missing {CONTRACT_PATH.as_posix()}."],
        "next_action": f"Run logics-manager release discover --write, then review and promote {DISCOVERY_DRAFT_PATH.as_posix()} to {CONTRACT_PATH.as_posix()}.",
        "evidence": [],
        "generated_at": _now_iso(),
        "repo_root": repo_root.as_posix(),
    }


def _selector_value(payload: Any, selector: str | None) -> Any:
    if not selector:
        return payload
    current = payload
    for part in selector.split("."):
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return None
    return current


def _read_simple_toml_value(text: str, selector: str | None) -> str | None:
    if not selector:
        return None
    parts = selector.split(".")
    key = parts[-1]
    section = ".".join(parts[:-1])
    active_section = ""
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("[") and line.endswith("]"):
            active_section = line[1:-1].strip()
            continue
        if active_section == section and (line.startswith(f"{key} ") or line.startswith(f"{key}=")):
            _, value = line.split("=", 1)
            return value.strip().strip('"').strip("'")
    return None


def _read_plain_text_value(text: str, selector: str | None) -> str:
    if selector == "badge.version":
        match = re.search(r"img\.shields\.io/badge/version-v([^-)\s]+)-", text)
        return match.group(1).strip() if match else ""
    return text.strip()


def _read_version_source(repo_root: Path, source: dict[str, Any]) -> dict[str, Any]:
    rel_path = source.get("path")
    required = bool(source.get("required", True))
    if not isinstance(rel_path, str) or not rel_path:
        return {"ok": False, "path": rel_path, "version": None, "required": required, "reason": "version source path is missing"}
    path = _bounded_repo_path(repo_root, rel_path)
    if path is None or not path.is_file():
        return {"ok": False, "path": rel_path, "version": None, "required": required, "reason": "file is missing"}
    fmt = source.get("format")
    selector = source.get("selector")
    try:
        text = path.read_text(encoding="utf-8")
        if fmt == "json":
            value = _selector_value(json.loads(text), selector if isinstance(selector, str) else None)
        elif fmt == "toml":
            value = _read_simple_toml_value(text, selector if isinstance(selector, str) else None)
        else:
            value = _read_plain_text_value(text, selector if isinstance(selector, str) else None)
    except Exception as exc:
        return {"ok": False, "path": rel_path, "version": None, "required": required, "reason": f"could not read version: {exc}"}
    if not isinstance(value, str) or not value.strip():
        return {"ok": False, "path": rel_path, "version": None, "required": required, "reason": "version value is missing"}
    return {"ok": True, "path": rel_path, "version": value.strip(), "required": required, "reason": None}


def _current_version(repo_root: Path, contract: dict[str, Any]) -> tuple[str | None, list[dict[str, Any]]]:
    sources = contract.get("version_sources")
    if not isinstance(sources, list):
        return None, []
    results = [_read_version_source(repo_root, source) for source in sources if isinstance(source, dict)]
    required_results = [result for result in results if result.get("required", True)]
    versions = [result["version"] for result in required_results if result.get("ok") and isinstance(result.get("version"), str)]
    unique_versions = sorted(set(versions))
    if len(unique_versions) > 1:
        for result in results:
            if result.get("required", True) and result.get("ok"):
                result["consistent"] = False
                result["reason"] = "version does not match other required sources"
        return None, results
    if any(not result.get("ok") for result in required_results):
        return None, results
    return (versions[0] if versions else None), results


def _version_source_blocking_reasons(version_sources: list[dict[str, Any]]) -> list[str]:
    if not version_sources:
        return ["version_metadata: no version sources configured"]
    required_sources = [source for source in version_sources if source.get("required", True)]
    missing = [
        f"{source.get('path') or '<unknown>'}: {source.get('reason') or 'version source is invalid'}"
        for source in required_sources
        if not source.get("ok")
    ]
    if missing:
        return [f"version_metadata: invalid version source ({'; '.join(missing)})"]
    versions = sorted({str(source.get("version")) for source in required_sources if source.get("ok") and source.get("version")})
    if len(versions) > 1:
        return [f"version_metadata: version sources disagree ({', '.join(versions)})"]
    return []


def _git_output(repo_root: Path, args: list[str]) -> str | None:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=repo_root,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=GIT_COMMAND_TIMEOUT_SECONDS,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def _current_commit(repo_root: Path) -> str | None:
    return _git_output(repo_root, ["rev-parse", "HEAD"])


def _commit_for_tag(repo_root: Path, tag: str) -> str | None:
    """Resolve a tag to the commit it points at, peeling annotated tags. None if the tag doesn't exist."""
    return _git_output(repo_root, ["rev-parse", f"{tag}^{{commit}}"])


def _release_commit(repo_root: Path, contract: dict[str, Any], target_version: str | None, branch_commit: str | None) -> str | None:
    """The commit the release was cut from: the tagged commit, or the working commit while no tag exists yet."""
    expected_tag = _expected_tag(contract, target_version)
    if not expected_tag:
        return branch_commit
    return _commit_for_tag(repo_root, expected_tag) or branch_commit


def _worktree_clean(repo_root: Path) -> bool | None:
    output = _git_output(repo_root, ["status", "--porcelain"])
    if output is None:
        return None
    return output == ""


def _render_path_template(path: str, version: str) -> str:
    return path.replace("{version}", version).replace("{version_underscore}", version.replace(".", "_").replace("-", "_"))


def _bounded_repo_path(repo_root: Path, rel_path: str) -> Path | None:
    """Resolve rel_path under repo_root; return None if it escapes the repo.

    Defense-in-depth: contract/changelog path templates are committed and trusted,
    but the rendered {version} segment is caller-supplied, so bound the result.
    """
    try:
        resolved = (repo_root / rel_path).resolve()
        root = repo_root.resolve()
    except (OSError, ValueError):
        return None
    if resolved != root and root not in resolved.parents:
        return None
    return resolved


def _evidence_store_path(repo_root: Path, contract: dict[str, Any]) -> Path:
    evidence = contract.get("evidence") if isinstance(contract.get("evidence"), dict) else {}
    store = evidence.get("store") if isinstance(evidence.get("store"), dict) else {}
    raw = store.get("path") if isinstance(store, dict) else None
    rel = raw if isinstance(raw, str) and raw else "logics/release/evidence.jsonl"
    bounded = _bounded_repo_path(repo_root, rel)
    # Fall back to the default in-repo store if a contract path escapes the repo.
    return bounded if bounded is not None else (repo_root / "logics/release/evidence.jsonl").resolve()


def _load_evidence(repo_root: Path, contract: dict[str, Any]) -> list[dict[str, Any]]:
    path = _evidence_store_path(repo_root, contract)
    if not path.is_file():
        return []
    entries: list[dict[str, Any]] = []
    for line_no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not raw.strip():
            continue
        try:
            entry = json.loads(raw)
        except json.JSONDecodeError:
            entries.append({"kind": "invalid", "status": "failed", "summary": f"invalid JSON at line {line_no}"})
            continue
        if isinstance(entry, dict):
            entries.append(entry)
    return entries


def _write_evidence_entry(repo_root: Path, contract: dict[str, Any], entry: dict[str, Any]) -> Path:
    path = _evidence_store_path(repo_root, contract)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        if fcntl is not None:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        try:
            handle.write(json.dumps(entry, sort_keys=True, separators=(",", ":")) + "\n")
            handle.flush()
        finally:
            if fcntl is not None:
                with contextlib.suppress(OSError):
                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
    return path


def _contract_gate(contract: dict[str, Any], gate_id: str) -> dict[str, Any] | None:
    gates = contract.get("gates") if isinstance(contract.get("gates"), list) else []
    for gate in gates:
        if isinstance(gate, dict) and gate.get("id") == gate_id:
            return gate
    return None


def _expected_tag(contract: dict[str, Any], version: str | None) -> str | None:
    tag_policy = (contract.get("git") or {}).get("tag_policy") if isinstance(contract.get("git"), dict) else {}
    if not isinstance(tag_policy, dict) or not version:
        return None
    pattern = tag_policy.get("pattern")
    if not isinstance(pattern, str) or not pattern:
        return None
    return pattern.replace("{version}", version)


def release_add_evidence_payload(
    repo_root: Path,
    *,
    gate_id: str,
    kind: str,
    status: str,
    summary: str,
    target_version: str | None = None,
    commit: str | None = None,
    tag: str | None = None,
    observed_at: str | None = None,
    path: str | None = None,
    url: str | None = None,
    command: str | None = None,
    run_id: str | None = None,
    target: str | None = None,
) -> dict[str, Any]:
    context = load_release_context(repo_root)
    if context.contract is None:
        payload = _not_configured_payload(repo_root)
        payload.update({"command": "release-evidence-add", "recorded": False})
        return payload
    root_contract = context.contract
    release_target = release_targets(root_contract, target, require_selected=True)[0]
    contract = release_target.contract
    gate = _contract_gate(contract, gate_id)
    if gate is None:
        raise ConfigError(f"Unknown release gate: {gate_id}")
    if kind not in EVIDENCE_KINDS:
        raise ConfigError(f"Unsupported evidence kind: {kind}")
    if kind not in set(gate.get("evidence_kinds") or []):
        raise ConfigError(f"Evidence kind {kind} is not allowed for gate {gate_id}.")
    if status not in GATE_STATUSES:
        raise ConfigError(f"Unsupported evidence status: {status}")
    if not summary.strip():
        raise ConfigError("Evidence summary is required.")

    current_version, _version_sources = _current_version(repo_root, contract)
    resolved_version = target_version or current_version
    resolved_commit = commit or _current_commit(repo_root)
    entry: dict[str, Any] = {
        "gate_id": gate_id,
        "kind": kind,
        "status": status,
        "observed_at": observed_at or _now_iso(),
        "target_version": resolved_version,
        "summary": summary.strip(),
    }
    if release_target.id is not None:
        entry["target_id"] = release_target.id
    if resolved_commit and kind in SOURCE_EVIDENCE_KINDS | {"ci"}:
        entry["commit"] = resolved_commit
    resolved_tag = tag or (_expected_tag(contract, resolved_version) if kind in PUBLICATION_EVIDENCE_KINDS else None)
    if resolved_tag:
        entry["tag"] = resolved_tag
    if path:
        entry["path"] = path
    if url:
        entry["url"] = url
    if command:
        entry["command"] = command
    if run_id:
        entry["run_id"] = run_id

    evidence_path = _write_evidence_entry(repo_root, root_contract, entry)
    status_payload = release_status_payload(repo_root, target=release_target.id)
    return {
        "ok": True,
        "configured": True,
        "command": "release-evidence-add",
        "recorded": True,
        "evidence_path": _rel(evidence_path, repo_root),
        "entry": entry,
        "state": status_payload.get("state"),
        "next_action": status_payload.get("next_action"),
        "generated_at": _now_iso(),
        "repo_root": repo_root.as_posix(),
    }


def release_reset_payload(repo_root: Path) -> dict[str, Any]:
    """Clear the recorded gate evidence so every release gate returns to pending.

    Removes the evidence store file (logics/release/evidence.jsonl by default).
    The contract itself is left untouched.
    """
    context = load_release_context(repo_root)
    if context.contract is None:
        payload = _not_configured_payload(repo_root)
        payload.update({"command": "release-evidence-reset", "reset": False, "cleared": 0})
        return payload
    contract = context.contract
    release_target = release_targets(contract, None, require_selected="targets" in contract)[0]
    evidence_path = _evidence_store_path(repo_root, contract)
    cleared = len(_load_evidence(repo_root, contract)) if evidence_path.is_file() else 0
    if evidence_path.is_file():
        evidence_path.unlink()
    status_payload = release_status_payload(repo_root, target=release_target.id)
    return {
        "ok": True,
        "configured": True,
        "command": "release-evidence-reset",
        "reset": True,
        "cleared": cleared,
        "evidence_path": _rel(evidence_path, repo_root),
        "state": status_payload.get("state"),
        "next_action": status_payload.get("next_action"),
        "generated_at": _now_iso(),
        "repo_root": repo_root.as_posix(),
    }


def release_reset_target_payload(repo_root: Path, target: str | None = None) -> dict[str, Any]:
    context = load_release_context(repo_root)
    if context.contract is None:
        payload = _not_configured_payload(repo_root)
        payload.update({"command": "release-evidence-reset", "reset": False, "cleared": 0})
        return payload
    contract = context.contract
    release_target = release_targets(contract, target, require_selected="targets" in contract)[0]
    if release_target.id is None:
        return release_reset_payload(repo_root)

    evidence_path = _evidence_store_path(repo_root, contract)
    if not evidence_path.is_file():
        cleared = 0
    else:
        kept: list[str] = []
        cleared = 0
        for raw in evidence_path.read_text(encoding="utf-8").splitlines():
            try:
                entry = json.loads(raw)
            except json.JSONDecodeError:
                kept.append(raw)
                continue
            if isinstance(entry, dict) and entry.get("target_id") == release_target.id:
                cleared += 1
            else:
                kept.append(raw)
        tmp = evidence_path.with_suffix(evidence_path.suffix + ".tmp")
        tmp.write_text(("\n".join(kept) + "\n") if kept else "", encoding="utf-8")
        tmp.replace(evidence_path)
    status_payload = release_status_payload(repo_root, target=release_target.id)
    return {
        "ok": True,
        "configured": True,
        "command": "release-evidence-reset",
        "reset": True,
        "target_id": release_target.id,
        "cleared": cleared,
        "evidence_path": _rel(evidence_path, repo_root),
        "state": status_payload.get("state"),
        "next_action": status_payload.get("next_action"),
        "generated_at": _now_iso(),
        "repo_root": repo_root.as_posix(),
    }


def _gate_evidence(gate_id: str, evidence: list[dict[str, Any]]) -> dict[str, Any] | None:
    matches = [entry for entry in evidence if entry.get("gate_id") == gate_id or entry.get("gate") == gate_id]
    if not matches:
        return None
    return matches[-1]


def _evidence_is_stale(
    entry: dict[str, Any],
    gate: dict[str, Any],
    target_version: str | None,
    branch_commit: str | None,
    release_commit: str | None,
    contract: dict[str, Any],
) -> str | None:
    freshness = (contract.get("evidence") or {}).get("freshness") if isinstance(contract.get("evidence"), dict) else {}
    if not isinstance(freshness, dict):
        freshness = {}
    if freshness.get("match_target_version", True) and target_version:
        evidence_version = entry.get("target_version")
        if evidence_version is None:
            return "evidence target version is missing"
        if evidence_version != target_version:
            return "evidence targets a different version"
    comparison = gate.get("comparison") if gate.get("comparison") in GATE_COMPARISONS else DEFAULT_GATE_COMPARISON
    commit = branch_commit if comparison == "branch" else release_commit
    evidence_kinds = set(gate.get("evidence_kinds") or [])
    if freshness.get("match_commit_for_source_gates", True) and commit and evidence_kinds & SOURCE_EVIDENCE_KINDS:
        evidence_commit = entry.get("commit")
        if evidence_commit is None:
            return f"evidence commit is missing ({comparison})"
        if evidence_commit != commit:
            return f"evidence targets a different commit ({comparison})"
    tag_policy = (contract.get("git") or {}).get("tag_policy") if isinstance(contract.get("git"), dict) else {}
    expected_tag = None
    if isinstance(tag_policy, dict) and target_version:
        pattern = tag_policy.get("pattern")
        if isinstance(pattern, str):
            expected_tag = pattern.replace("{version}", target_version)
    if freshness.get("match_tag_for_publication_gates", True) and expected_tag and evidence_kinds & PUBLICATION_EVIDENCE_KINDS:
        evidence_tag = entry.get("tag")
        if evidence_tag is None:
            return "evidence tag is missing"
        if evidence_tag != expected_tag:
            return "evidence targets a different tag"
    return None


def _gate_payload(
    gate: dict[str, Any],
    evidence: list[dict[str, Any]],
    target_version: str | None,
    branch_commit: str | None,
    release_commit: str | None,
    contract: dict[str, Any],
) -> dict[str, Any]:
    gate_id = gate.get("id")
    if not isinstance(gate_id, str):
        gate_id = "unknown"
    comparison = gate.get("comparison") if gate.get("comparison") in GATE_COMPARISONS else DEFAULT_GATE_COMPARISON
    entry = _gate_evidence(gate_id, evidence)
    evidence_ref = None
    blocking_reason = None
    status = "pending" if gate.get("required", True) else "skipped"
    if entry is not None:
        evidence_ref = {
            "kind": entry.get("kind"),
            "status": entry.get("status"),
            "observed_at": entry.get("observed_at"),
            "target_version": entry.get("target_version"),
            "commit": entry.get("commit"),
            "tag": entry.get("tag"),
            "summary": entry.get("summary"),
            "url": entry.get("url"),
            "path": entry.get("path"),
        }
        raw_status = entry.get("status")
        status = raw_status if isinstance(raw_status, str) and raw_status in GATE_STATUSES else "failed"
        stale_reason = _evidence_is_stale(entry, gate, target_version, branch_commit, release_commit, contract)
        if stale_reason:
            status = "stale"
            blocking_reason = stale_reason
        elif status == "failed":
            blocking_reason = str(entry.get("summary") or "evidence failed")
    elif gate.get("required", True):
        blocking_reason = "missing required evidence"
    return {
        "id": gate_id,
        "state": gate.get("state"),
        "required": bool(gate.get("required", True)),
        "status": status,
        "comparison": comparison,
        "blocking_reason": blocking_reason,
        "evidence": evidence_ref,
    }


def _state_from_gates(gates: list[dict[str, Any]]) -> str:
    required = [gate for gate in gates if gate.get("required")]
    if any(gate["status"] in {"failed", "stale", "blocked"} for gate in required):
        return "blocked"
    if all(gate["status"] == "passed" for gate in required):
        return "ready"
    for gate in required:
        if gate["status"] in {"pending", "not_configured"}:
            return str(gate.get("state") or "planning")
    return "planning"


def release_status_payload(repo_root: Path, *, target: str | None = None) -> dict[str, Any]:
    context = load_release_context(repo_root)
    if context.contract is None:
        return _not_configured_payload(repo_root)
    root_contract = context.contract
    targets = release_targets(root_contract, target)
    if len(targets) > 1:
        target_payloads = [release_status_payload(repo_root, target=release_target.id) for release_target in targets]
        blocking = [f"{item['target_id']}: {reason}" for item in target_payloads for reason in item.get("blocking_reasons", [])]
        ok = all(bool(item.get("ok")) for item in target_payloads)
        return {
            "ok": ok,
            "configured": True,
            "state": "ready" if ok else "blocked",
            "target_version": None,
            "contract_path": CONTRACT_PATH.as_posix(),
            "targets": [
                {
                    "id": item.get("target_id"),
                    "state": item.get("state"),
                    "ok": item.get("ok"),
                    "target_version": item.get("target_version"),
                    "blocking_reasons": item.get("blocking_reasons", []),
                }
                for item in target_payloads
            ],
            "gates": [],
            "blocking_reasons": blocking,
            "next_action": "All release targets are ready." if ok else (blocking[0] if blocking else "Collect evidence for each target."),
            "evidence": _load_evidence(repo_root, root_contract),
            "generated_at": _now_iso(),
            "repo_root": repo_root.as_posix(),
        }
    release_target = targets[0]
    contract = release_target.contract
    target_version, version_sources = _current_version(repo_root, contract)
    commit = _current_commit(repo_root)
    release_commit = _release_commit(repo_root, contract, target_version, commit)
    evidence = target_evidence(_load_evidence(repo_root, root_contract), release_target.id)
    raw_gates = contract.get("gates") if isinstance(contract.get("gates"), list) else []
    gates = [_gate_payload(gate, evidence, target_version, commit, release_commit, contract) for gate in raw_gates if isinstance(gate, dict)]
    version_blocking_reasons = _version_source_blocking_reasons(version_sources)
    state = "blocked" if version_blocking_reasons else _state_from_gates(gates)
    blocking_reasons = [
        *version_blocking_reasons,
        *[f"{gate['id']}: {gate['blocking_reason']}" for gate in gates if gate.get("required") and gate.get("blocking_reason")],
    ]
    next_action = "Release evidence is complete." if state == "ready" else (blocking_reasons[0] if blocking_reasons else "Collect evidence for the next pending gate.")
    return {
        "ok": state == "ready",
        "configured": True,
        "state": state,
        "target_version": target_version,
        "target_id": release_target.id,
        "commit": commit,
        "release_commit": release_commit,
        "contract_path": CONTRACT_PATH.as_posix(),
        "version_sources": version_sources,
        "gates": gates,
        "blocking_reasons": blocking_reasons,
        "next_action": next_action,
        "evidence": evidence,
        "generated_at": _now_iso(),
        "repo_root": repo_root.as_posix(),
    }


def release_context_pack_payload(repo_root: Path, *, target: str | None = None) -> dict[str, Any]:
    status = release_status_payload(repo_root, target=target)
    gates = [
        {
            "id": gate.get("id"),
            "state": gate.get("state"),
            "required": gate.get("required"),
            "status": gate.get("status"),
            "blocking_reason": gate.get("blocking_reason"),
        }
        for gate in status.get("gates", [])
        if isinstance(gate, dict)
    ]
    return {
        "configured": bool(status.get("configured")),
        "target_version": status.get("target_version"),
        "target_id": status.get("target_id"),
        "targets": status.get("targets", []),
        "state": status.get("state"),
        "next_action": status.get("next_action"),
        "contract_path": status.get("contract_path"),
        "required_gates": [gate for gate in gates if gate.get("required")],
        "blocking_reasons": status.get("blocking_reasons", []),
        "safe_actions": [
            "logics-manager release status",
            "logics-manager release plan <version>",
            "logics-manager release validate <version>",
        ],
        "publication_actions": [
            "GitHub release publication",
            "external publication",
        ],
        "guidance": [
            "Release readiness must come from project-owned evidence, not conversational memory.",
            "Use release status or validate before preparing or claiming release readiness.",
            "Publication-oriented actions are explicit operator actions and are separate from safe read/validate actions.",
        ],
    }


def release_plan_payload(repo_root: Path, version: str, *, target: str | None = None) -> dict[str, Any]:
    context = load_release_context(repo_root)
    if context.contract is None:
        payload = _not_configured_payload(repo_root)
        payload.update({"command": "release-plan", "target_version": version, "steps": []})
        return payload
    root_contract = context.contract
    release_target = release_targets(root_contract, target, require_selected=True)[0]
    contract = release_target.contract
    steps: list[dict[str, Any]] = []
    for source in contract.get("version_sources", []):
        if isinstance(source, dict):
            steps.append({"kind": "version_source", "path": source.get("path"), "expected_version": version})
    changelog = contract.get("changelog") if isinstance(contract.get("changelog"), dict) else {}
    for path_rule in changelog.get("paths", []) if isinstance(changelog.get("paths"), list) else []:
        if isinstance(path_rule, dict) and isinstance(path_rule.get("path"), str):
            steps.append({"kind": "changelog", "path": _render_path_template(path_rule["path"], version), "required": path_rule.get("required", changelog.get("required", True))})
    for command in contract.get("validation_commands", []) if isinstance(contract.get("validation_commands"), list) else []:
        if isinstance(command, dict):
            steps.append({"kind": "validation_command", "id": command.get("id"), "command": command.get("command"), "required": command.get("required", True), "publication_action": False})
    git = contract.get("git") if isinstance(contract.get("git"), dict) else {}
    tag_policy = git.get("tag_policy") if isinstance(git.get("tag_policy"), dict) else {}
    steps.append({"kind": "git", "release_branch_policy": git.get("release_branch_policy"), "tag": str(tag_policy.get("pattern", "v{version}")).replace("{version}", version), "required": True, "publication_action": False})
    github_release = contract.get("github_release") if isinstance(contract.get("github_release"), dict) else {}
    steps.append({"kind": "github_release", "mode": github_release.get("mode"), "required": github_release.get("required", False), "publication_action": True})
    for external in contract.get("external_publication", []) if isinstance(contract.get("external_publication"), list) else []:
        if isinstance(external, dict):
            steps.append({"kind": "external_publication", "id": external.get("id"), "required": external.get("required", False), "url": str(external.get("url_template", "")).replace("{version}", version) if external.get("url_template") else None, "publication_action": True})
    return {
        "ok": True,
        "configured": True,
        "command": "release-plan",
        "target_version": version,
        "target_id": release_target.id,
        "contract_path": CONTRACT_PATH.as_posix(),
        "steps": steps,
        "safe_read_validate_actions": ["release status", "release plan", "release validate"],
        "publication_requires_explicit_operator_action": True,
        "next_action": "Update release files, collect validation evidence, commit, push, verify CI, then publish explicitly.",
        "generated_at": _now_iso(),
        "repo_root": repo_root.as_posix(),
    }


def _read_json_file(path: Path) -> dict[str, Any] | None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


def _read_text_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def _project_identity(repo_root: Path) -> dict[str, str]:
    package_json = _read_json_file(repo_root / "package.json") or {}
    raw_name = package_json.get("name")
    if isinstance(raw_name, str) and raw_name.strip():
        project_id = raw_name.rsplit("/", 1)[-1].strip()
        display_name = project_id.replace("-", " ").replace("_", " ").title()
        return {"id": project_id, "display_name": display_name}
    pyproject = _read_text_file(repo_root / "pyproject.toml")
    project_match = re.search(r"(?m)^name\s*=\s*[\"']([^\"']+)[\"']", pyproject)
    if project_match:
        project_id = project_match.group(1).strip()
        return {"id": project_id, "display_name": project_id.replace("-", " ").replace("_", " ").title()}
    return {"id": repo_root.name, "display_name": repo_root.name.replace("-", " ").replace("_", " ").title()}


def _discover_version_sources(repo_root: Path) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    if (repo_root / "VERSION").is_file():
        sources.append({"path": "VERSION", "format": "plain_text", "required": True})
    if (repo_root / "package.json").is_file():
        sources.append({"path": "package.json", "format": "json", "selector": "version", "required": True})
    if (repo_root / "package-lock.json").is_file():
        sources.append({"path": "package-lock.json", "format": "json", "selector": "version", "required": True})
    if (repo_root / "pyproject.toml").is_file():
        sources.append({"path": "pyproject.toml", "format": "toml", "selector": "project.version", "required": True})
    if (repo_root / ".claude-plugin" / "plugin.json").is_file():
        sources.append({"path": ".claude-plugin/plugin.json", "format": "json", "selector": "version", "required": True})
    readme = repo_root / "README.md"
    if readme.is_file() and "img.shields.io/badge/version-v" in _read_text_file(readme):
        sources.append({"path": "README.md", "format": "plain_text", "selector": "badge.version", "required": False})
    if not sources:
        sources.append({"path": "VERSION", "format": "plain_text", "required": False})
    return sources


def _discover_changelog(repo_root: Path) -> dict[str, Any]:
    if (repo_root / "changelogs").is_dir():
        return {
            "required": True,
            "version_heading_required": True,
            "paths": [{"path": "changelogs/CHANGELOGS_{version_underscore}.md", "format": "markdown", "required": True}],
        }
    if (repo_root / "CHANGELOG.md").is_file():
        return {
            "required": True,
            "version_heading_required": True,
            "paths": [{"path": "CHANGELOG.md", "format": "markdown", "required": True}],
        }
    return {
        "required": True,
        "version_heading_required": True,
        "paths": [{"path": "CHANGELOG.md", "format": "markdown", "required": False}],
    }


def _package_scripts(repo_root: Path) -> dict[str, str]:
    package_json = _read_json_file(repo_root / "package.json") or {}
    scripts = package_json.get("scripts")
    return {key: value for key, value in scripts.items() if isinstance(key, str) and isinstance(value, str)} if isinstance(scripts, dict) else {}


def _discover_validation_commands(repo_root: Path) -> list[dict[str, Any]]:
    scripts = _package_scripts(repo_root)
    preferred = ["ci:check", "ci:blocking", "release:validate", "release:changelog:validate", "lint", "test", "build"]
    commands = []
    for script_name in preferred:
        if script_name in scripts:
            commands.append({"id": script_name.replace(":", "_"), "command": ["npm", "run", script_name], "required": True, "evidence_kind": "command"})
    if not commands and (repo_root / "pyproject.toml").is_file():
        commands.append({"id": "python_tests", "command": ["python3", "-m", "pytest"], "required": True, "evidence_kind": "command"})
    return commands


def _has_workflow(repo_root: Path, name: str) -> bool:
    workflows = repo_root / ".github" / "workflows"
    return any(path.name == name for path in workflows.glob("*")) if workflows.is_dir() else False


def _discover_external_publication(repo_root: Path) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []
    package_json = _read_json_file(repo_root / "package.json") or {}
    package_name = package_json.get("name")
    if isinstance(package_name, str) and package_name.strip():
        checks.append({"id": "npm_package", "kind": "package_registry", "required": _has_workflow(repo_root, "publish-npm.yml"), "url_template": f"https://www.npmjs.com/package/{package_name}/v/{{version}}"})
    pyproject = _read_text_file(repo_root / "pyproject.toml")
    project_match = re.search(r"(?m)^name\s*=\s*[\"']([^\"']+)[\"']", pyproject)
    if project_match:
        checks.append({"id": "pypi_package", "kind": "package_registry", "required": _has_workflow(repo_root, "publish-pypi.yml"), "url_template": f"https://pypi.org/project/{project_match.group(1)}/{{version}}/"})
    if (repo_root / "render.yaml").is_file():
        checks.append({"id": "production_deployment", "kind": "deployment", "required": True, "description": "Verify the production deployment for the target commit and version."})
    return checks


def release_discover_payload(repo_root: Path, *, write: bool = False, force: bool = False) -> dict[str, Any]:
    context = load_release_context(repo_root)
    if context.contract is not None and not force:
        return {
            "ok": True,
            "configured": True,
            "command": "release-discover",
            "contract_path": CONTRACT_PATH.as_posix(),
            "draft_path": None,
            "draft_written": False,
            "next_action": f"Use {CONTRACT_PATH.as_posix()} as the active release contract.",
            "generated_at": _now_iso(),
            "repo_root": repo_root.as_posix(),
        }

    identity = _project_identity(repo_root)
    external_publication = _discover_external_publication(repo_root)
    github_release_required = _has_workflow(repo_root, "release.yml") or _has_workflow(repo_root, "deploy-release.yml")
    draft: dict[str, Any] = {
        "schema_version": "1.0",
        "project": {**identity, "release_profile": "discovered-local"},
        "version_sources": _discover_version_sources(repo_root),
        "changelog": _discover_changelog(repo_root),
        "operator_intents": DISCOVERY_OPERATOR_INTENTS,
        "missing_contract_discovery": DISCOVERY_MISSING_CONTRACT,
        "state_machine": DEFAULT_STATE_MACHINE,
        "gates": [
            {"id": "version_metadata", "state": "preparing", "required": True, "evidence_kinds": ["file"], "comparison": "release"},
            {"id": "changelog", "state": "preparing", "required": True, "evidence_kinds": ["file"], "comparison": "release"},
            {"id": "local_validation", "state": "local_validation", "required": True, "evidence_kinds": ["command"], "comparison": "release"},
            {
                "id": "git_push",
                "state": "pushed",
                "required": True,
                "evidence_kinds": ["git"],
                "comparison": "branch",
                "comparison_reason": "A push claim describes this branch's HEAD, not the tagged release commit.",
            },
            {"id": "ci", "state": "ci_verification", "required": True, "evidence_kinds": ["ci"], "comparison": "release"},
            {"id": "github_release", "state": "github_release", "required": github_release_required, "evidence_kinds": ["github_release"], "comparison": "release"},
        ],
        "evidence": {
            "store": {"path": "logics/release/evidence.jsonl", "format": "jsonl", "required": True},
            "freshness": {
                "match_target_version": True,
                "match_commit_for_source_gates": True,
                "match_tag_for_publication_gates": True,
            },
            "required_fields": ["kind", "status", "observed_at", "target_version", "commit", "summary"],
        },
        "validation_commands": _discover_validation_commands(repo_root),
        "git": {
            "release_branch_policy": "main_only",
            "allowed_branches": ["main"],
            "tag_policy": {"required": github_release_required, "pattern": "v{version}"},
            "require_clean_worktree": True,
            "require_pushed_commit": True,
        },
        "github_release": {
            "required": github_release_required,
            "mode": "gh_cli" if github_release_required else "manual",
            "draft_allowed": False,
            "asset_paths": [],
        },
        "assistant_readiness": {
            "must_inspect_status_before_claiming_ready": True,
            "readiness_source": "project_owned_evidence",
            "publication_requires_explicit_operator_approval": True,
        },
    }
    if external_publication:
        draft["external_publication"] = external_publication
        draft["gates"].extend(
            {"id": check["id"], "state": "external_publication", "required": bool(check.get("required")), "evidence_kinds": ["external"], "comparison": "release"}
            for check in external_publication
        )

    draft_path = repo_root / DISCOVERY_DRAFT_PATH
    if write:
        draft_path.parent.mkdir(parents=True, exist_ok=True)
        draft_path.write_text(json.dumps(draft, indent=2, sort_keys=False) + "\n", encoding="utf-8")

    return {
        "ok": True,
        "configured": False,
        "command": "release-discover",
        "contract_path": CONTRACT_PATH.as_posix(),
        "draft_path": DISCOVERY_DRAFT_PATH.as_posix(),
        "draft_written": write,
        "draft": draft,
        "local_sources": draft["missing_contract_discovery"]["local_sources"],
        "next_action": f"Review {DISCOVERY_DRAFT_PATH.as_posix()} and promote it to {CONTRACT_PATH.as_posix()} when it matches the repo release process.",
        "generated_at": _now_iso(),
        "repo_root": repo_root.as_posix(),
    }


def release_validate_payload(repo_root: Path, version: str, *, target: str | None = None) -> dict[str, Any]:
    status = release_status_payload(repo_root, target=target)
    checks: list[dict[str, Any]] = []
    if not status.get("configured"):
        return {**status, "command": "release-validate", "target_version": version, "checks": [{"id": "config", "status": "failed", "message": "release contract is missing"}]}
    contract = load_release_context(repo_root).contract or {}
    for result in status.get("version_sources", []):
        check_status = "passed" if result.get("ok") and result.get("version") == version else "failed"
        message = "version matches target" if check_status == "passed" else str(result.get("reason") or f"expected {version}, found {result.get('version')}")
        checks.append({"id": f"version:{result.get('path')}", "status": check_status, "message": message})
    changelog = contract.get("changelog") if isinstance(contract.get("changelog"), dict) else {}
    for path_rule in changelog.get("paths", []) if isinstance(changelog.get("paths"), list) else []:
        if isinstance(path_rule, dict) and isinstance(path_rule.get("path"), str) and path_rule.get("required", changelog.get("required", True)):
            rel_path = _render_path_template(path_rule["path"], version)
            bounded = _bounded_repo_path(repo_root, rel_path)
            exists = bounded is not None and bounded.is_file()
            checks.append({"id": f"changelog:{rel_path}", "status": "passed" if exists else "failed", "message": "file exists" if exists else "required changelog is missing"})
    clean = _worktree_clean(repo_root)
    git = contract.get("git") if isinstance(contract.get("git"), dict) else {}
    if git.get("require_clean_worktree", True):
        checks.append({"id": "git:clean_worktree", "status": "passed" if clean else "failed", "message": "worktree is clean" if clean else "worktree has changes or git is unavailable"})
    for gate in status.get("gates", []):
        if isinstance(gate, dict) and gate.get("required"):
            passed = gate.get("status") == "passed"
            checks.append({"id": f"gate:{gate.get('id')}", "status": "passed" if passed else "failed", "message": gate.get("blocking_reason") or gate.get("status")})
    ok = all(check["status"] == "passed" for check in checks)
    return {
        **status,
        "ok": ok,
        "command": "release-validate",
        "target_version": version,
        "checks": checks,
        "next_action": "Release validation passed." if ok else next((check["message"] for check in checks if check["status"] != "passed"), "Fix failing release checks."),
    }


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = []
    if argv in (["-h"], ["--help"]):
        print(release_main_help())
        return 0
    if argv[:3] == ["evidence", "add", "--help"] or argv[:3] == ["evidence", "add", "-h"]:
        print(
            "\n".join(
                [
                    "Usage: logics-manager release evidence add <gate> --kind <kind> --status <status> --summary <text> [args...]",
                    "",
                    f"Kinds: {', '.join(sorted(EVIDENCE_KINDS))}",
                    f"Statuses: {', '.join(sorted(GATE_STATUSES))}",
                    "",
                    "Example:",
                    f"  {release_evidence_add_example()}",
                ]
            )
        )
        return 0
    if len(argv) >= 2 and argv[1] in {"-h", "--help"}:
        help_text = release_subcommand_help(argv[0], release_evidence_add_example())
        if help_text:
            print(help_text)
            return 0
    parser = release_parser(EVIDENCE_KINDS, GATE_STATUSES)
    try:
        parsed = parser.parse_args(argv)
    except SystemExit as exc:
        if argv[:2] == ["evidence", "add"]:
            print(f"Example: {release_evidence_add_example(argv[2] if len(argv) > 2 else '<gate>')}", file=sys.stderr)
        raise exc
    if parsed.command is None:
        raise SystemExit("Usage: logics-manager release <plan|status|validate> [args...]")
    repo_root = find_repo_root(Path.cwd())
    if parsed.command == "status":
        payload = release_status_payload(repo_root, target=parsed.target)
        print(render_payload(payload, parsed.format, lambda: render_release_status(payload)))
        return 0 if payload.get("configured") else 1
    if parsed.command == "discover":
        payload = release_discover_payload(repo_root, write=parsed.write, force=parsed.force)
        print(render_payload(payload, parsed.format, lambda: render_release_discover(payload)))
        return 0 if payload.get("ok") else 1
    if parsed.command == "plan":
        payload = release_plan_payload(repo_root, parsed.version, target=parsed.target)
        print(render_payload(payload, parsed.format, lambda: render_release_plan(payload)))
        return 0 if payload.get("configured") else 1
    if parsed.command == "evidence":
        if parsed.evidence_command == "reset":
            payload = release_reset_target_payload(repo_root, target=parsed.target)
            print(render_payload(payload, parsed.format, lambda: render_release_evidence_reset(payload)))
            return 0 if payload.get("ok") else 1
        if parsed.evidence_command != "add":
            raise SystemExit("Usage: logics-manager release evidence add <gate> --kind <kind> --status <status> --summary <text>")
        payload = release_add_evidence_payload(
            repo_root,
            gate_id=parsed.gate_id,
            kind=parsed.kind,
            status=parsed.status,
            summary=parsed.summary,
            target_version=parsed.target_version,
            commit=parsed.commit,
            tag=parsed.tag,
            observed_at=parsed.observed_at,
            path=parsed.path,
            url=parsed.url,
            command=parsed.evidence_command_text,
            run_id=parsed.run_id,
            target=parsed.target,
        )
        print(render_payload(payload, parsed.format, lambda: render_release_evidence_add(payload)))
        return 0 if payload.get("ok") else 1
    payload = release_validate_payload(repo_root, parsed.version, target=parsed.target)
    print(render_payload(payload, parsed.format, lambda: render_release_validate(payload)))
    return 0 if payload.get("ok") else 1
