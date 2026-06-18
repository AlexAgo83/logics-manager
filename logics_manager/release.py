from __future__ import annotations

import argparse
import json
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import ConfigError, find_repo_root
from .cli_output import render_payload


CONTRACT_PATH = Path("logics/release/contract.json")
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
        "next_action": f"Add {CONTRACT_PATH.as_posix()} using logics/release/release-contract.v1.schema.json.",
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
    if not isinstance(rel_path, str) or not rel_path:
        return {"ok": False, "path": rel_path, "version": None, "reason": "version source path is missing"}
    path = repo_root / rel_path
    if not path.is_file():
        return {"ok": False, "path": rel_path, "version": None, "reason": "file is missing"}
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
        return {"ok": False, "path": rel_path, "version": None, "reason": f"could not read version: {exc}"}
    if not isinstance(value, str) or not value.strip():
        return {"ok": False, "path": rel_path, "version": None, "reason": "version value is missing"}
    return {"ok": True, "path": rel_path, "version": value.strip(), "reason": None}


def _current_version(repo_root: Path, contract: dict[str, Any]) -> tuple[str | None, list[dict[str, Any]]]:
    sources = contract.get("version_sources")
    if not isinstance(sources, list):
        return None, []
    results = [_read_version_source(repo_root, source) for source in sources if isinstance(source, dict)]
    versions = [result["version"] for result in results if result.get("ok") and isinstance(result.get("version"), str)]
    return (versions[0] if versions else None), results


def _git_output(repo_root: Path, args: list[str]) -> str | None:
    try:
        result = subprocess.run(["git", *args], cwd=repo_root, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    except OSError:
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
        handle.write(json.dumps(entry, sort_keys=True, separators=(",", ":")) + "\n")
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


def _gate_evidence(gate_id: str, evidence: list[dict[str, Any]]) -> dict[str, Any] | None:
    matches = [entry for entry in evidence if entry.get("gate_id") == gate_id or entry.get("gate") == gate_id]
    if not matches:
        return None
    return matches[-1]


def _evidence_is_stale(entry: dict[str, Any], gate: dict[str, Any], target_version: str | None, commit: str | None, contract: dict[str, Any]) -> str | None:
    freshness = (contract.get("evidence") or {}).get("freshness") if isinstance(contract.get("evidence"), dict) else {}
    if not isinstance(freshness, dict):
        freshness = {}
    if freshness.get("match_target_version", True) and target_version and entry.get("target_version") not in (None, target_version):
        return "evidence targets a different version"
    evidence_kinds = set(gate.get("evidence_kinds") or [])
    if freshness.get("match_commit_for_source_gates", True) and commit and evidence_kinds & SOURCE_EVIDENCE_KINDS and entry.get("commit") not in (None, commit):
        return "evidence targets a different commit"
    tag_policy = (contract.get("git") or {}).get("tag_policy") if isinstance(contract.get("git"), dict) else {}
    expected_tag = None
    if isinstance(tag_policy, dict) and target_version:
        pattern = tag_policy.get("pattern")
        if isinstance(pattern, str):
            expected_tag = pattern.replace("{version}", target_version)
    if freshness.get("match_tag_for_publication_gates", True) and expected_tag and evidence_kinds & PUBLICATION_EVIDENCE_KINDS and entry.get("tag") not in (None, expected_tag):
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


def release_status_payload(repo_root: Path) -> dict[str, Any]:
    context = load_release_context(repo_root)
    if context.contract is None:
        return _not_configured_payload(repo_root)
    contract = context.contract
    target_version, version_sources = _current_version(repo_root, contract)
    commit = _current_commit(repo_root)
    evidence = _load_evidence(repo_root, contract)
    raw_gates = contract.get("gates") if isinstance(contract.get("gates"), list) else []
    gates = [_gate_payload(gate, evidence, target_version, commit, contract) for gate in raw_gates if isinstance(gate, dict)]
    state = _state_from_gates(gates)
    blocking_reasons = [f"{gate['id']}: {gate['blocking_reason']}" for gate in gates if gate.get("required") and gate.get("blocking_reason")]
    next_action = "Release evidence is complete." if state == "ready" else (blocking_reasons[0] if blocking_reasons else "Collect evidence for the next pending gate.")
    return {
        "ok": state == "ready",
        "configured": True,
        "state": state,
        "target_version": target_version,
        "commit": commit,
        "contract_path": CONTRACT_PATH.as_posix(),
        "version_sources": version_sources,
        "gates": gates,
        "blocking_reasons": blocking_reasons,
        "next_action": next_action,
        "evidence": evidence,
        "generated_at": _now_iso(),
        "repo_root": repo_root.as_posix(),
    }


def release_context_pack_payload(repo_root: Path) -> dict[str, Any]:
    status = release_status_payload(repo_root)
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


def release_plan_payload(repo_root: Path, version: str) -> dict[str, Any]:
    context = load_release_context(repo_root)
    if context.contract is None:
        payload = _not_configured_payload(repo_root)
        payload.update({"command": "release-plan", "target_version": version, "steps": []})
        return payload
    contract = context.contract
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
        "contract_path": CONTRACT_PATH.as_posix(),
        "steps": steps,
        "safe_read_validate_actions": ["release status", "release plan", "release validate"],
        "publication_requires_explicit_operator_action": True,
        "next_action": "Update release files, collect validation evidence, commit, push, verify CI, then publish explicitly.",
        "generated_at": _now_iso(),
        "repo_root": repo_root.as_posix(),
    }


def release_validate_payload(repo_root: Path, version: str) -> dict[str, Any]:
    status = release_status_payload(repo_root)
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
            exists = (repo_root / rel_path).is_file()
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


def render_release_status(payload: dict[str, Any]) -> str:
    lines = [
        f"Release state: {payload['state']}",
        f"Configured: {'yes' if payload.get('configured') else 'no'}",
        f"Target version: {payload.get('target_version') or '<unknown>'}",
        f"Next action: {payload.get('next_action')}",
    ]
    gates = payload.get("gates") if isinstance(payload.get("gates"), list) else []
    if gates:
        lines.append("Gates:")
        for gate in gates:
            lines.append(f"- {gate['id']}: {gate['status']}" + (f" ({gate['blocking_reason']})" if gate.get("blocking_reason") else ""))
    return "\n".join(lines)


def render_release_plan(payload: dict[str, Any]) -> str:
    lines = [f"Release plan for {payload.get('target_version')}", f"Configured: {'yes' if payload.get('configured') else 'no'}"]
    steps = payload.get("steps") if isinstance(payload.get("steps"), list) else []
    for step in steps:
        label = step.get("id") or step.get("path") or step.get("kind")
        lines.append(f"- {step.get('kind')}: {label}")
    lines.append(f"Next action: {payload.get('next_action')}")
    return "\n".join(lines)


def render_release_validate(payload: dict[str, Any]) -> str:
    lines = [f"Release validation: {'passed' if payload.get('ok') else 'failed'}", f"Target version: {payload.get('target_version') or '<unknown>'}"]
    for check in payload.get("checks", []) if isinstance(payload.get("checks"), list) else []:
        lines.append(f"- {check['id']}: {check['status']} ({check['message']})")
    lines.append(f"Next action: {payload.get('next_action')}")
    return "\n".join(lines)


def render_release_evidence_add(payload: dict[str, Any]) -> str:
    entry = payload.get("entry") if isinstance(payload.get("entry"), dict) else {}
    return "\n".join(
        [
            f"Release evidence recorded: {'yes' if payload.get('recorded') else 'no'}",
            f"Gate: {entry.get('gate_id') or '<unknown>'}",
            f"Status: {entry.get('status') or '<unknown>'}",
            f"Evidence store: {payload.get('evidence_path') or '<unknown>'}",
            f"Next action: {payload.get('next_action')}",
        ]
    )


def main(argv: list[str] | None = None) -> int:
    if argv is None:
        argv = []
    if argv in (["-h"], ["--help"]):
        print(
            "\n".join(
                [
                    "Logics Release CLI",
                    "Plan, inspect, and validate project-owned release workflow state.",
                    "",
                    "Usage:",
                    "  logics-manager release status [--format text|json]",
                    "  logics-manager release plan <version> [--format text|json]",
                    "  logics-manager release validate <version> [--format text|json]",
                    "  logics-manager release evidence add <gate> --kind <kind> --status <status> --summary <text> [--format text|json]",
                ]
            )
        )
        return 0
    if len(argv) >= 2 and argv[1] in {"-h", "--help"}:
        help_text = {
            "status": "Usage: logics-manager release status [--format text|json]",
            "plan": "Usage: logics-manager release plan <version> [--format text|json]",
            "validate": "Usage: logics-manager release validate <version> [--format text|json]",
            "evidence": "Usage: logics-manager release evidence add <gate> --kind <kind> --status <status> --summary <text> [--format text|json]",
        }.get(argv[0])
        if help_text:
            print(help_text)
            return 0
    parser = argparse.ArgumentParser(prog="logics-manager release", add_help=False)
    sub = parser.add_subparsers(dest="command")
    status = sub.add_parser("status", add_help=False)
    status.add_argument("--format", choices=("text", "json"), default="text")
    plan = sub.add_parser("plan", add_help=False)
    plan.add_argument("version")
    plan.add_argument("--format", choices=("text", "json"), default="text")
    validate = sub.add_parser("validate", add_help=False)
    validate.add_argument("version")
    validate.add_argument("--format", choices=("text", "json"), default="text")
    evidence = sub.add_parser("evidence", add_help=False)
    evidence_sub = evidence.add_subparsers(dest="evidence_command")
    evidence_add = evidence_sub.add_parser("add", add_help=False)
    evidence_add.add_argument("gate_id")
    evidence_add.add_argument("--kind", required=True, choices=sorted(EVIDENCE_KINDS))
    evidence_add.add_argument("--status", required=True, choices=sorted(GATE_STATUSES))
    evidence_add.add_argument("--summary", required=True)
    evidence_add.add_argument("--target-version")
    evidence_add.add_argument("--commit")
    evidence_add.add_argument("--tag")
    evidence_add.add_argument("--observed-at")
    evidence_add.add_argument("--path")
    evidence_add.add_argument("--url")
    evidence_add.add_argument("--command", dest="evidence_command_text")
    evidence_add.add_argument("--run-id")
    evidence_add.add_argument("--format", choices=("text", "json"), default="text")
    parsed = parser.parse_args(argv)
    if parsed.command is None:
        raise SystemExit("Usage: logics-manager release <plan|status|validate> [args...]")
    repo_root = find_repo_root(Path.cwd())
    if parsed.command == "status":
        payload = release_status_payload(repo_root)
        print(render_payload(payload, parsed.format, lambda: render_release_status(payload)))
        return 0 if payload.get("configured") else 1
    if parsed.command == "plan":
        payload = release_plan_payload(repo_root, parsed.version)
        print(render_payload(payload, parsed.format, lambda: render_release_plan(payload)))
        return 0 if payload.get("configured") else 1
    if parsed.command == "evidence":
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
        )
        print(render_payload(payload, parsed.format, lambda: render_release_evidence_add(payload)))
        return 0 if payload.get("ok") else 1
    payload = release_validate_payload(repo_root, parsed.version)
    print(render_payload(payload, parsed.format, lambda: render_release_validate(payload)))
    return 0 if payload.get("ok") else 1
