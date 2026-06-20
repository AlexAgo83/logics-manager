"""Review and validation assist subcommands."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from . import assist as _assist
from . import assist_support as _support


def cmd_diff_risk(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    changed_paths = _assist._git_changed_paths(repo_root)
    classification = _support._classify_diff_risk(changed_paths)
    payload = {
        "command": "assist",
        "kind": "diff-risk",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        "changed_paths": changed_paths,
        **classification,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(_support._render_diff_risk_text(payload))
    return payload


def cmd_commit_plan(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    changed_paths = _assist._git_changed_paths(repo_root)
    plan = _support._build_commit_plan(changed_paths)
    payload = {
        "command": "assist",
        "kind": "commit-plan",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        **plan,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Commit plan: {payload['subject']}")
        print(f"- scope: {payload['scope']}")
        print(f"- confidence: {payload['confidence']}")
        print(f"- review recommended: {'yes' if payload['review_recommended'] else 'no'}")
    return payload


def cmd_changed_surface_summary(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    changed_paths = _assist._git_changed_paths(repo_root)
    payload = {
        "command": "assist",
        "kind": "changed-surface-summary",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        **_support._build_changed_surface_summary(changed_paths),
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Changed surface: {payload['primary_category']}")
        print(f"- summary: {payload['summary']}")
        print(f"- changed paths: {len(changed_paths)}")
        if payload["counts"]:
            for label, count in payload["counts"].items():
                print(f"- {label}: {count}")
    return payload


def cmd_review_checklist(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    payload = {
        "command": "assist",
        "kind": "review-checklist",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        **_support._build_review_checklist(repo_root),
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print("Review checklist:")
        print(f"- confidence: {payload['confidence']}")
        print(f"- summary: {payload['summary']}")
        print(f"- doc consistency: {payload['doc_consistency']['overall']}")
        for item in payload["checklist"]:
            print(f"- {item}")
    return payload


def cmd_validation_checklist(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    changed_paths = _assist._git_changed_paths(repo_root)
    payload = {
        "command": "assist",
        "kind": "validation-checklist",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        **_support._build_validation_checklist(changed_paths),
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print("Validation checklist:")
        print(f"- profile: {payload['profile']}")
        print(f"- confidence: {payload['confidence']}")
        for check in payload["checks"]:
            print(f"- {check}")
    return payload


def cmd_validation_summary(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    payload = {
        "command": "assist",
        "kind": "validation-summary",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        **_support._build_validation_summary(repo_root),
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print("Validation summary:")
        print(f"- overall: {payload['overall']}")
        print(f"- confidence: {payload['confidence']}")
        print(f"- summary: {payload['summary']}")
        print(f"- doc consistency: {payload['doc_consistency']['overall']}")
        print(f"- test commands: {len(payload['test_impact']['recommended_commands'])}")
        for action in payload["next_actions"]:
            print(f"- {action}")
    return payload


def cmd_test_impact_summary(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _assist.find_repo_root(Path.cwd())
    config, config_path = _assist.load_repo_config(repo_root)
    changed_paths = _assist._git_changed_paths(repo_root)
    payload = {
        "command": "assist",
        "kind": "test-impact-summary",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        **_support._build_test_impact_summary(changed_paths),
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print("Test impact summary:")
        print(f"- confidence: {payload['confidence']}")
        print(f"- summary: {payload['summary']}")
        for command in payload["recommended_commands"]:
            print(f"- {command}")
    return payload
