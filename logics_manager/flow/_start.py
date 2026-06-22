from __future__ import annotations

import os


def _indicator_value_from_lines(lines: list[str], key: str) -> str | None:
    prefix = f"> {key}:"
    for line in lines:
        if line.startswith(prefix):
            return line.split(":", 1)[1].strip()
    return None


def _upsert_workflow_indicator(lines: list[str], key: str, value: str) -> list[str]:
    prefix = f"> {key}:"
    updated: list[str] = []
    replaced = False
    last_indicator_index = -1
    for line in lines:
        if line.startswith("> "):
            last_indicator_index = len(updated)
        if line.startswith(prefix):
            updated.append(f"> {key}: {value}")
            replaced = True
        else:
            updated.append(line)
    if not replaced:
        insert_at = last_indicator_index + 1 if last_indicator_index >= 0 else 1
        updated.insert(insert_at, f"> {key}: {value}")
    return updated


def start_payload(repo_root: Path, source: str, *, owner: str | None, dry_run: bool) -> dict[str, object]:
    source_path, kind = _resolve_any_workflow_source(repo_root, source)
    lines = source_path.read_text(encoding="utf-8").splitlines()
    previous_status = _indicator_value_from_lines(lines, "Status") or ""
    previous_owner = _indicator_value_from_lines(lines, "Owner") or ""
    resolved_owner = (owner if owner is not None else os.environ.get("LOGICS_AGENT", "")).strip()
    warnings: list[str] = []
    if not resolved_owner:
        warnings.append("No owner provided; set LOGICS_AGENT or pass --owner.")
    if _normalize_status(previous_status) == "in progress" and previous_owner and resolved_owner and previous_owner != resolved_owner:
        warnings.append(f"already owner={previous_owner}; overriding with owner={resolved_owner}.")

    updated = _upsert_workflow_indicator(lines, "Status", "In progress")
    if resolved_owner:
        updated = _upsert_workflow_indicator(updated, "Owner", resolved_owner)
    changed = updated != lines
    if changed and not dry_run:
        source_path.write_text("\n".join(updated) + "\n", encoding="utf-8")

    return {
        "command": "start",
        "kind": kind,
        "source": source_path.relative_to(repo_root).as_posix(),
        "previous_status": previous_status,
        "status": "In progress",
        "owner": resolved_owner or None,
        "previous_owner": previous_owner or None,
        "warnings": warnings,
        "changed": changed,
        "dry_run": dry_run,
    }


def cmd_start(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = start_payload(repo_root, args.source, owner=args.owner, dry_run=args.dry_run)
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        owner_text = f" owner={payload['owner']}" if payload.get("owner") else " owner=(none)"
        print(f"Started {payload['source']}: {payload['status']}{owner_text}")
        for warning in payload["warnings"]:
            print(f"Warning: {warning}")
    return payload
