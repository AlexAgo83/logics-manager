"""Context, runtime, and Claude bridge assist subcommands."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from shutil import which

from . import assist as _assist
from . import assist_support as _support
from .config import ConfigError
from .path_utils import resolve_repo_output_path


def cmd_claude_bridges(args: argparse.Namespace) -> dict[str, object]:
    try:
        repo_root = _assist.find_repo_root(Path.cwd())
    except ConfigError:
        repo_root = Path.cwd().resolve()
    try:
        _, config_path = _assist.load_repo_config(repo_root)
    except ConfigError:
        config_path = None
    payload = {
        "command": "assist",
        "kind": "claude-bridge-manifest",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        **_support._build_claude_bridge_manifest(repo_root),
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print("Claude bridge manifest: OK")
        for bridge in payload["bridges"]:
            print(f"- {bridge['command_path']}")
            print(f"- {bridge['agent_path']}")
    return payload


def cmd_claude_instructions(args: argparse.Namespace) -> dict[str, object]:
    try:
        repo_root = _assist.find_repo_root(Path.cwd())
    except ConfigError:
        repo_root = Path.cwd().resolve()
    payload = {
        **_assist._build_claude_instructions(repo_root),
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print("Claude instructions: OK")
        print(payload["path"])
    return payload


def cmd_doc_consistency(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    payload = {
        "command": "assist",
        "kind": "doc-consistency",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        **_support._build_doc_consistency(repo_root),
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Doc consistency: {payload['overall'].upper()}")
        print(f"- summary: {payload['summary']}")
        print(f"- confidence: {payload['confidence']}")
        print(f"- doctor issues: {payload['doctor']['issue_count']}")
        print(f"- lint issues: {payload['lint']['issue_count']}")
        for follow_up in payload["follow_up"]:
            print(f"- {follow_up}")
    return payload


def cmd_roi_report(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    audit_log = _support._repo_path(repo_root, args.audit_log, _support._hybrid_audit_log(config), label="configured audit_log")
    measurement_log = _support._repo_path(repo_root, args.measurement_log, _support._hybrid_measurement_log(config), label="configured measurement_log")
    payload = _support._build_hybrid_roi_report(
        repo_root,
        audit_log=audit_log,
        measurement_log=measurement_log,
        recent_limit=args.recent_limit,
        window_days=args.window_days,
    )
    payload["command"] = "assist"
    payload["kind"] = "roi-report"
    payload["repo_root"] = repo_root.as_posix()
    payload["config_path"] = str(config_path.relative_to(repo_root)) if config_path is not None else None

    if args.out:
        out_path, output_path = resolve_repo_output_path(repo_root, args.out)
        payload["output_path"] = output_path
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(serialized, encoding="utf-8")
        if args.format == "json":
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"Wrote {output_path}")
    elif args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print("Assist ROI report: OK")
        print(f"- runs: {payload['measured']['totals']['runs']}")
        print(f"- local offload rate: {payload['derived']['rates']['local_offload_rate']}")
        print(f"- estimated remote token avoidance: {payload['estimated']['proxies']['estimated_remote_token_avoidance']}")
    return payload


def cmd_runtime_status(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    hybrid = config.get("hybrid_assist", {})
    model_profiles = hybrid.get("model_profiles", {}) if isinstance(hybrid, dict) else {}
    default_profile = args.model_profile or str(hybrid.get("default_model_profile", "unknown"))
    profile_entry = model_profiles.get(default_profile, {}) if isinstance(model_profiles, dict) else {}
    bridge_status = _support._claude_bridge_status(repo_root)

    requested_backend = args.backend or str(hybrid.get("default_backend", "auto"))
    selected_backend, reasons = _support._select_backend(requested_backend, bridge_status)
    resolved_model = args.model or str(profile_entry.get("model") or hybrid.get("default_model", "unknown"))
    resolved_host = args.ollama_host or str(hybrid.get("ollama_host", "http://127.0.0.1:11434"))
    timeout_seconds = args.timeout or float(hybrid.get("timeout_seconds", 20.0))

    payload = {
        "command": "assist",
        "kind": "runtime-status",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        "requested_backend": requested_backend,
        "selected_backend": selected_backend,
        "selection_reasons": reasons,
        "requested_model_profile": args.model_profile,
        "resolved_model_profile": default_profile,
        "requested_model": args.model,
        "resolved_model": resolved_model,
        "ollama_host": resolved_host,
        "timeout_seconds": timeout_seconds,
        "bridge_status": bridge_status,
        "runtime_commands": {
            "codex": which("codex"),
            "python": which("python3"),
        },
        "healthy": bool(bridge_status["available"]) or selected_backend == "deterministic",
        "model_profiles": sorted(model_profiles.keys()) if isinstance(model_profiles, dict) else [],
    }

    if args.out:
        out_path, output_path = resolve_repo_output_path(repo_root, args.out)
        payload["output_path"] = output_path
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(serialized, encoding="utf-8")
        if args.format == "json":
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"Wrote {output_path}")
    elif args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print("Assist runtime status: " + ("OK" if payload["healthy"] else "DEGRADED"))
        print(f"- selected backend: {selected_backend}")
        print(f"- model profile: {default_profile}")
        print(f"- model: {resolved_model}")
        print(f"- global Claude runtime available: {'yes' if bridge_status['available'] else 'no'}")
        if bridge_status["preferred_variant"]:
            print(f"- runtime variant: {bridge_status['preferred_variant']}")
    return payload


def cmd_context(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    spec = _support.ASSIST_FLOW_DEFAULTS[args.flow_name]
    context_mode = args.context_mode or spec["mode"]
    profile = args.profile or spec["profile"]
    bridge_status = _support._claude_bridge_status(repo_root)
    payload = {
        "command": "assist",
        "kind": "context",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        "flow_name": args.flow_name,
        "seed_ref": args.ref,
        "context_profile": {
            "mode": context_mode,
            "profile": profile,
            "include_graph": args.include_graph if args.include_graph is not None else spec["include_graph"],
            "include_registry": args.include_registry if args.include_registry is not None else spec["include_registry"],
            "include_doctor": args.include_doctor if args.include_doctor is not None else spec["include_doctor"],
        },
        "contract": spec,
        "assist_schema_version": "1.0",
        "bridge_status": bridge_status,
        "context_pack": _assist._build_context_pack(
            repo_root,
            args.ref,
            mode=context_mode,
            profile=profile,
        ) if args.ref else {
            "ref": None,
            "mode": context_mode,
            "profile": profile,
            "budgets": {"max_docs": 0},
            "changed_paths": [],
            "docs": [],
            "estimates": {"doc_count": 0, "char_count": 0},
        },
    }

    if args.out:
        out_path, output_path = resolve_repo_output_path(repo_root, args.out)
        payload["output_path"] = output_path
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(serialized, encoding="utf-8")
        if args.format == "json":
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"Wrote {output_path}")
    elif args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Assist context: {args.flow_name}")
        print(f"- ref: {args.ref or '<flow-default>'}")
        print(f"- mode: {context_mode}")
        print(f"- profile: {profile}")
        print(f"- global Claude runtime available: {'yes' if bridge_status['available'] else 'no'}")
    return payload
