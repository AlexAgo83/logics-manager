"""Workflow authoring and handoff assist subcommands."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from . import assist as _assist
from . import assist_support as _support
from .path_utils import resolve_repo_output_path


def cmd_request_draft(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    payload = {
        "command": "assist",
        "kind": "request-draft",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        "execution_mode": args.execution_mode,
        "intent": args.intent,
        **_assist._build_request_draft(repo_root, intent=args.intent),
    }
    if args.execution_mode == "execute":
        out_path, output_path = resolve_repo_output_path(repo_root, str(payload["path"]), label="output")
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(payload["content"], encoding="utf-8")
            payload["written"] = True
        else:
            payload["written"] = False
        payload["output_path"] = output_path
    else:
        payload["written"] = False
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Request draft: {payload['title']}")
        print(f"- ref: {payload['ref']}")
        print(f"- path: {payload['path']}")
        print(f"- execution mode: {args.execution_mode}")
        print(f"- from version: {payload['from_version']}")
        print("- needs:")
        for item in payload["needs"]:
            print(f"  - {item}")
        print("- acceptance:")
        for item in payload["acceptance"]:
            print(f"  - {item}")
        if args.execution_mode == "suggestion-only":
            print("- suggestion only: no file written")
        elif args.dry_run:
            print("- dry run: file not written")
        else:
            print(f"- written: {'yes' if payload['written'] else 'no'}")
    return payload


def cmd_spec_first_pass(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    payload = {
        "command": "assist",
        "kind": "spec-first-pass",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        "execution_mode": args.execution_mode,
        "source_ref": args.ref,
        **_assist._build_spec_first_pass(repo_root, args.ref),
    }
    if args.execution_mode == "execute":
        out_path, output_path = resolve_repo_output_path(repo_root, str(payload["path"]), label="output")
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(payload["content"], encoding="utf-8")
            payload["written"] = True
        else:
            payload["written"] = False
        payload["output_path"] = output_path
    else:
        payload["written"] = False
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Spec first pass: {payload['title']}")
        print(f"- source ref: {payload['source_ref']}")
        print(f"- path: {payload['path']}")
        print(f"- execution mode: {args.execution_mode}")
        print(f"- overview: {payload['overview']}")
        print("- goals:")
        for item in payload["goals"]:
            print(f"  - {item}")
        print("- acceptance:")
        for item in payload["acceptance"]:
            print(f"  - {item}")
        if args.execution_mode == "suggestion-only":
            print("- suggestion only: no file written")
        elif args.dry_run:
            print("- dry run: file not written")
        else:
            print(f"- written: {'yes' if payload['written'] else 'no'}")
    return payload


def cmd_backlog_groom(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    payload = {
        "command": "assist",
        "kind": "backlog-groom",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        "execution_mode": args.execution_mode,
        "source_ref": args.ref,
        **_assist._build_backlog_groom(repo_root, args.ref),
    }
    if args.execution_mode == "execute":
        out_path, output_path = resolve_repo_output_path(repo_root, str(payload["path"]), label="output")
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(payload["content"], encoding="utf-8")
            payload["written"] = True
            request_path, _request_output_path = resolve_repo_output_path(repo_root, str(payload["request_path"]), label="request_path")
            _support._append_section_bullets(request_path, "Backlog", [f"`{payload['ref']}`"], dry_run=False)
        else:
            payload["written"] = False
        payload["output_path"] = output_path
    else:
        payload["written"] = False
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Backlog groom: {payload['title']}")
        print(f"- source ref: {payload['source_ref']}")
        print(f"- path: {payload['path']}")
        print(f"- execution mode: {args.execution_mode}")
        print(f"- complexity: {payload['complexity']}")
        print("- acceptance:")
        for item in payload["acceptance"]:
            print(f"  - {item}")
        if args.execution_mode == "suggestion-only":
            print("- suggestion only: no file written")
        elif args.dry_run:
            print("- dry run: file not written")
        else:
            print(f"- written: {'yes' if payload['written'] else 'no'}")
    return payload


def cmd_closure_summary(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    payload = {
        "command": "assist",
        "kind": "closure-summary",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        **_support._build_closure_summary(repo_root, args.ref),
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Closure summary: {payload['summary']}")
        print(f"- ref: {payload['ref'] or '<none>'}")
        print(f"- doc path: {payload['doc_path'] or '<none>'}")
        print(f"- status: {payload['status'] or '<none>'}")
        for item in payload["delivered"]:
            print(f"- delivered: {item}")
        for item in payload["validations"]:
            print(f"- validation: {item}")
        for item in payload["remaining_risks"]:
            print(f"- risk: {item}")
    return payload


def cmd_handoff(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    payload = {
        "command": "assist",
        "kind": "handoff",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        **_assist._build_handoff(repo_root, args.since),
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Handoff since {payload['since']}:")
        print(f"- commits: {payload['commit_count']}")
        print(f"- changed paths: {len(payload['changed_paths'])}")
        print(f"- primary surface: {payload['surface']['primary_category']}")
        for commit in payload["commits"][:8]:
            print(f"- commit: {commit['commit']} {commit['subject']}")
        for doc in payload["logics_docs"][:8]:
            print(f"- logics: {doc['ref']} [{doc['status']}] {doc['path']}")
        for validation in payload["validations"][:8]:
            print(f"- validation: {validation}")
        for action in payload["next_actions"]:
            print(f"- next: {action}")
    return payload


def cmd_next_step(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    payload = {
        "command": "assist",
        "kind": "next-step",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        **_support._build_next_step(repo_root, args.ref),
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Next step: {payload['action']}")
        print(f"- ref: {payload['ref'] or '<none>'}")
        print(f"- doc path: {payload['doc_path'] or '<none>'}")
        print(f"- status: {payload['status'] or '<none>'}")
        print(f"- rationale: {payload['rationale']}")
        for item in payload["checklist"]:
            print(f"- {item}")
    return payload
