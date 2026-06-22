from __future__ import annotations

import argparse
import contextlib
import json
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import ConfigError, find_repo_root
from .cli_output import render_payload


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
    path = repo_root / rel_path
    if not path.is_file():
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


def _worktree_clean(repo_root: Path) -> bool | None:
    output = _git_output(repo_root, ["status", "--porcelain"])
    if output is None:
        return None
    return output == ""


def _render_path_template(path: str, version: str) -> str:
    return path.replace("{version}", version).replace("{version_underscore}", version.replace(".", "_").replace("-", "_"))


def _evidence_store_path(repo_root: Path, contract: dict[str, Any]) -> Path:
    evidence = contract.get("evidence") if isinstance(contract.get("evidence"), dict) else {}
    store = evidence.get("store") if isinstance(evidence.get("store"), dict) else {}
    raw = store.get("path") if isinstance(store, dict) else None
    return repo_root / (raw if isinstance(raw, str) and raw else "logics/release/evidence.jsonl")


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
) -> dict[str, Any]:
    context = load_release_context(repo_root)
    if context.contract is None:
        payload = _not_configured_payload(repo_root)
        payload.update({"command": "release-evidence-add", "recorded": False})
        return payload
    contract = context.contract
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

    evidence_path = _write_evidence_entry(repo_root, contract, entry)
    status_payload = release_status_payload(repo_root)
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
    evidence_path = _evidence_store_path(repo_root, contract)
    cleared = len(_load_evidence(repo_root, contract)) if evidence_path.is_file() else 0
    if evidence_path.is_file():
        evidence_path.unlink()
    status_payload = release_status_payload(repo_root)
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


def _gate_evidence(gate_id: str, evidence: list[dict[str, Any]]) -> dict[str, Any] | None:
    matches = [entry for entry in evidence if entry.get("gate_id") == gate_id or entry.get("gate") == gate_id]
    if not matches:
        return None
    return matches[-1]


def _evidence_is_stale(entry: dict[str, Any], gate: dict[str, Any], target_version: str | None, commit: str | None, contract: dict[str, Any]) -> str | None:
    freshness = (contract.get("evidence") or {}).get("freshness") if isinstance(contract.get("evidence"), dict) else {}
    if not isinstance(freshness, dict):
        freshness = {}
    if freshness.get("match_target_version", True) and target_version:
        evidence_version = entry.get("target_version")
        if evidence_version is None:
            return "evidence target version is missing"
        if evidence_version != target_version:
            return "evidence targets a different version"
    evidence_kinds = set(gate.get("evidence_kinds") or [])
    if freshness.get("match_commit_for_source_gates", True) and commit and evidence_kinds & SOURCE_EVIDENCE_KINDS:
        evidence_commit = entry.get("commit")
        if evidence_commit is None:
            return "evidence commit is missing"
        if evidence_commit != commit:
            return "evidence targets a different commit"
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


def _gate_payload(gate: dict[str, Any], evidence: list[dict[str, Any]], target_version: str | None, commit: str | None, contract: dict[str, Any]) -> dict[str, Any]:
    gate_id = gate.get("id")
    if not isinstance(gate_id, str):
        gate_id = "unknown"
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
        stale_reason = _evidence_is_stale(entry, gate, target_version, commit, contract)
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
        "blocking_reason": blocking_reason,
        "evidence": evidence_ref,
    }


