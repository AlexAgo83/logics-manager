from __future__ import annotations

import argparse
from typing import Any, Callable


def release_parser(evidence_kinds: set[str], gate_statuses: set[str]) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="logics-manager release", add_help=False)
    sub = parser.add_subparsers(dest="command")
    status = sub.add_parser("status")
    status.add_argument("--target")
    status.add_argument("--format", choices=("text", "json"), default="text")
    discover = sub.add_parser("discover")
    discover.add_argument("--write", action="store_true")
    discover.add_argument("--force", action="store_true")
    discover.add_argument("--format", choices=("text", "json"), default="text")
    plan = sub.add_parser("plan")
    plan.add_argument("version")
    plan.add_argument("--target")
    plan.add_argument("--format", choices=("text", "json"), default="text")
    validate = sub.add_parser("validate")
    validate.add_argument("version")
    validate.add_argument("--target")
    validate.add_argument("--format", choices=("text", "json"), default="text")
    evidence_sub = sub.add_parser("evidence").add_subparsers(dest="evidence_command")
    evidence_add = evidence_sub.add_parser("add")
    evidence_add.add_argument("gate_id")
    evidence_add.add_argument("--kind", required=True, choices=sorted(evidence_kinds))
    evidence_add.add_argument("--status", required=True, choices=sorted(gate_statuses))
    evidence_add.add_argument("--summary", required=True)
    evidence_add.add_argument("--target-version")
    evidence_add.add_argument("--commit")
    evidence_add.add_argument("--tag")
    evidence_add.add_argument("--observed-at")
    evidence_add.add_argument("--path")
    evidence_add.add_argument("--url")
    evidence_add.add_argument("--command", dest="evidence_command_text")
    evidence_add.add_argument("--run-id")
    evidence_add.add_argument("--target")
    evidence_add.add_argument("--format", choices=("text", "json"), default="text")
    evidence_reset = evidence_sub.add_parser("reset")
    evidence_reset.add_argument("--target")
    evidence_reset.add_argument("--format", choices=("text", "json"), default="text")
    return parser


def render_release_status(payload: dict[str, Any]) -> str:
    lines = [
        f"Release state: {payload['state']}",
        f"Configured: {'yes' if payload.get('configured') else 'no'}",
        f"Target version: {payload.get('target_version') or '<unknown>'}",
        f"Next action: {payload.get('next_action')}",
    ]
    gates = payload.get("gates") if isinstance(payload.get("gates"), list) else []
    for gate in gates:
        lines.append(
            f"- {gate['id']} [{gate.get('comparison', 'release')}]: {gate['status']}"
            + (f" ({gate['blocking_reason']})" if gate.get("blocking_reason") else "")
        )
    return "\n".join(lines)


def render_release_plan(payload: dict[str, Any]) -> str:
    lines = [f"Release plan for {payload.get('target_version')}", f"Configured: {'yes' if payload.get('configured') else 'no'}"]
    for step in payload.get("steps", []) if isinstance(payload.get("steps"), list) else []:
        lines.append(f"- {step.get('kind')}: {step.get('id') or step.get('path') or step.get('kind')}")
    lines.append(f"Next action: {payload.get('next_action')}")
    return "\n".join(lines)


def render_release_discover(payload: dict[str, Any]) -> str:
    lines = [
        f"Release contract configured: {'yes' if payload.get('configured') else 'no'}",
        f"Draft path: {payload.get('draft_path') or '<none>'}",
        f"Draft written: {'yes' if payload.get('draft_written') else 'no'}",
        f"Next action: {payload.get('next_action')}",
    ]
    draft = payload.get("draft") if isinstance(payload.get("draft"), dict) else {}
    commands = draft.get("validation_commands") if isinstance(draft.get("validation_commands"), list) else []
    for command in commands:
        lines.append(f"- {command.get('id')}: {' '.join(command.get('command') or [])}")
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


def render_release_evidence_reset(payload: dict[str, Any]) -> str:
    return "\n".join(
        [
            f"Release evidence reset: {'yes' if payload.get('reset') else 'no'}",
            f"Target: {payload.get('target_id') or '<legacy>'}",
            f"Cleared: {payload.get('cleared', 0)}",
            f"Evidence store: {payload.get('evidence_path') or '<unknown>'}",
            f"Next action: {payload.get('next_action')}",
        ]
    )


RenderFn = Callable[[dict[str, Any]], str]


def release_main_help() -> str:
    return "\n".join(
        [
            "Logics Release CLI",
            "Plan, inspect, and validate project-owned release workflow state.",
            "",
            "Usage:",
            "  logics-manager release status [--format text|json]",
            "  logics-manager release discover [--write] [--force] [--format text|json]",
            "  logics-manager release plan <version> [--target <id>] [--format text|json]",
            "  logics-manager release validate <version> [--target <id>] [--format text|json]",
            "  logics-manager release evidence add <gate> --kind <kind> --status <status> --summary <text> [--target <id>] [--format text|json]",
            "  logics-manager release evidence reset [--target <id>] [--format text|json]",
        ]
    )


def release_subcommand_help(command: str, example: str) -> str | None:
    return {
        "status": "Usage: logics-manager release status [--target <id>] [--format text|json]",
        "discover": "Usage: logics-manager release discover [--write] [--force] [--format text|json]",
        "plan": "Usage: logics-manager release plan <version> [--target <id>] [--format text|json]",
        "validate": "Usage: logics-manager release validate <version> [--target <id>] [--format text|json]",
        "evidence": "Usage: logics-manager release evidence add <gate> --kind <kind> --status <status> --summary <text> [--target <id>] [--format text|json]\nExample:\n  "
        + example,
    }.get(command)
