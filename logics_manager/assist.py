from __future__ import annotations

import argparse
import json
from pathlib import Path
from shutil import which

from .config import find_repo_root, load_repo_config


CLAUDE_BRIDGE_VARIANTS: tuple[dict[str, str], ...] = (
    {
        "id": "hybrid-assist",
        "command_path": ".claude/commands/logics-assist.md",
        "agent_path": ".claude/agents/logics-hybrid-delivery-assistant.md",
    },
    {
        "id": "flow-manager",
        "command_path": ".claude/commands/logics-flow.md",
        "agent_path": ".claude/agents/logics-flow-manager.md",
    },
)

ASSIST_FLOW_DEFAULTS: dict[str, dict[str, object]] = {
    "context-pack": {"mode": "summary-only", "profile": "normal", "include_graph": False, "include_registry": False, "include_doctor": False},
    "request-draft": {"mode": "summary-only", "profile": "normal", "include_graph": False, "include_registry": False, "include_doctor": False},
    "next-step": {"mode": "diff-first", "profile": "deep", "include_graph": True, "include_registry": True, "include_doctor": True},
    "diff-risk": {"mode": "diff-first", "profile": "tiny", "include_graph": False, "include_registry": False, "include_doctor": False},
    "commit-plan": {"mode": "summary-only", "profile": "normal", "include_graph": False, "include_registry": False, "include_doctor": False},
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="logics-manager assist",
        description="Inspect the local assist/runtime surface.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    runtime = sub.add_parser("runtime-status", help="Report local assist runtime readiness.")
    runtime.add_argument("--backend")
    runtime.add_argument("--model-profile")
    runtime.add_argument("--model")
    runtime.add_argument("--ollama-host")
    runtime.add_argument("--timeout", type=float)
    runtime.add_argument("--format", choices=("text", "json"), default="text")
    runtime.add_argument("--out", help="Write the JSON status payload to this relative path.")
    runtime.add_argument("--dry-run", action="store_true")
    runtime.set_defaults(func=cmd_runtime_status)

    context = sub.add_parser("context", help="Build a shared assist context bundle for a flow.")
    context.add_argument("flow_name", choices=tuple(sorted(ASSIST_FLOW_DEFAULTS.keys())))
    context.add_argument("ref", nargs="?", help="Optional workflow ref for flows that target a doc.")
    context.add_argument("--context-mode", choices=("summary-only", "diff-first", "full"))
    context.add_argument("--profile", choices=("tiny", "normal", "deep"))
    context.add_argument("--include-graph", action="store_true", default=None)
    context.add_argument("--include-registry", action="store_true", default=None)
    context.add_argument("--include-doctor", action="store_true", default=None)
    context.add_argument("--format", choices=("text", "json"), default="text")
    context.add_argument("--out", help="Write the JSON context bundle to this relative path.")
    context.add_argument("--dry-run", action="store_true")
    context.set_defaults(func=cmd_context)

    return parser


def _claude_bridge_status(repo_root: Path) -> dict[str, object]:
    detected_variants: list[str] = []
    for variant in CLAUDE_BRIDGE_VARIANTS:
        if (repo_root / variant["command_path"]).is_file() and (repo_root / variant["agent_path"]).is_file():
            detected_variants.append(variant["id"])
    return {
        "available": bool(detected_variants),
        "preferred_variant": detected_variants[0] if detected_variants else None,
        "detected_variants": detected_variants,
        "supported_variants": [variant["id"] for variant in CLAUDE_BRIDGE_VARIANTS],
    }


def _select_backend(requested_backend: str | None, bridge_status: dict[str, object]) -> tuple[str, list[str]]:
    if requested_backend and requested_backend != "auto":
        return requested_backend, []
    if bridge_status.get("available"):
        return "codex", ["claude bridge files detected"]
    return "deterministic", ["no bridge files detected"]


def _workflow_docs(repo_root: Path) -> list[Path]:
    docs: list[Path] = []
    for directory in ("request", "backlog", "tasks"):
        docs.extend(sorted((repo_root / "logics" / directory).glob("*.md")))
    return docs


def _build_context_pack(repo_root: Path, seed_ref: str, *, mode: str, profile: str) -> dict[str, object]:
    docs = _workflow_docs(repo_root)
    selected: list[Path] = []
    for path in docs:
        text = path.read_text(encoding="utf-8")
        if seed_ref in path.stem or seed_ref in text:
            selected.append(path)
    if not selected:
        selected = docs[:4]
    selected = selected[: {"tiny": 2, "normal": 4, "deep": 8}.get(profile, 4)]
    return {
        "ref": seed_ref,
        "mode": mode,
        "profile": profile,
        "budgets": {"max_docs": {"tiny": 2, "normal": 4, "deep": 8}.get(profile, 4)},
        "changed_paths": [],
        "docs": [
            {
                "ref": path.stem,
                "path": path.relative_to(repo_root).as_posix(),
                "kind": path.parent.name,
                "title": path.read_text(encoding="utf-8").splitlines()[0].replace("#", "").strip() if path.read_text(encoding="utf-8").splitlines() else path.stem,
            }
            for path in selected
        ],
        "estimates": {
            "doc_count": len(selected),
            "char_count": sum(len(path.read_text(encoding="utf-8")) for path in selected),
        },
    }


def cmd_runtime_status(args: argparse.Namespace) -> dict[str, object]:
    repo_root = find_repo_root(Path.cwd())
    config, config_path = load_repo_config(repo_root)
    hybrid = config.get("hybrid_assist", {})
    model_profiles = hybrid.get("model_profiles", {}) if isinstance(hybrid, dict) else {}
    default_profile = args.model_profile or str(hybrid.get("default_model_profile", "unknown"))
    profile_entry = model_profiles.get(default_profile, {}) if isinstance(model_profiles, dict) else {}
    bridge_status = _claude_bridge_status(repo_root)

    requested_backend = args.backend or str(hybrid.get("default_backend", "auto"))
    selected_backend, reasons = _select_backend(requested_backend, bridge_status)
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
        out_path = (repo_root / args.out).resolve()
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(serialized, encoding="utf-8")
        print(f"Wrote {out_path.relative_to(repo_root)}")
        payload["output_path"] = out_path.relative_to(repo_root).as_posix()
    elif args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print("Assist runtime status: " + ("OK" if payload["healthy"] else "DEGRADED"))
        print(f"- selected backend: {selected_backend}")
        print(f"- model profile: {default_profile}")
        print(f"- model: {resolved_model}")
        print(f"- bridge available: {'yes' if bridge_status['available'] else 'no'}")
        if bridge_status["preferred_variant"]:
            print(f"- bridge variant: {bridge_status['preferred_variant']}")
    return payload


def cmd_context(args: argparse.Namespace) -> dict[str, object]:
    repo_root = find_repo_root(Path.cwd())
    config, config_path = load_repo_config(repo_root)
    spec = ASSIST_FLOW_DEFAULTS[args.flow_name]
    context_mode = args.context_mode or spec["mode"]
    profile = args.profile or spec["profile"]
    bridge_status = _claude_bridge_status(repo_root)
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
        "context_pack": _build_context_pack(
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
        out_path = (repo_root / args.out).resolve()
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(serialized, encoding="utf-8")
        print(f"Wrote {out_path.relative_to(repo_root)}")
        payload["output_path"] = out_path.relative_to(repo_root).as_posix()
    elif args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Assist context: {args.flow_name}")
        print(f"- ref: {args.ref or '<flow-default>'}")
        print(f"- mode: {context_mode}")
        print(f"- profile: {profile}")
        print(f"- bridge available: {'yes' if bridge_status['available'] else 'no'}")
    return payload


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    payload = args.func(args)
    return 0 if isinstance(payload, dict) else 1
