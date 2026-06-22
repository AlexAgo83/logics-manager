def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="logics-manager sync",
        description="Synchronize workflow closure transitions.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    close_eligible = sub.add_parser("close-eligible-requests", help="Auto-close requests when all linked backlog items are done.")
    close_eligible.add_argument("--format", choices=("text", "json"), default="text")
    close_eligible.add_argument("--dry-run", action="store_true")
    close_eligible.set_defaults(func=cmd_close_eligible_requests)

    refresh_mermaid = sub.add_parser("refresh-mermaid-signatures", help="Refresh stale workflow Mermaid signatures without rewriting the full diagram body.")
    refresh_mermaid.add_argument("sources", nargs="*", help="Optional workflow refs or paths to scope the refresh.")
    refresh_mermaid.add_argument("--changed-only", action="store_true", help="Refresh only changed workflow docs.")
    refresh_mermaid.add_argument("--format", choices=("text", "json"), default="text")
    refresh_mermaid.add_argument("--dry-run", action="store_true")
    refresh_mermaid.set_defaults(func=cmd_refresh_mermaid_signatures)

    schema_status = sub.add_parser("schema-status", help="Report schema-version coverage for workflow docs.")
    schema_status.add_argument("sources", nargs="*", help="Optional workflow refs or paths to scope the scan.")
    schema_status.add_argument("--format", choices=("text", "json"), default="text")
    schema_status.set_defaults(func=cmd_schema_status)

    read_doc = sub.add_parser("read-doc", help="Read a bounded workflow document payload by ref or path.")
    read_doc.add_argument("source", help="Workflow ref or repo-relative path.")
    read_doc.add_argument("--max-chars", type=int, default=4000)
    read_doc.add_argument("--section", action="append", default=[], help="Section heading to include; repeatable.")
    read_doc.add_argument("--format", choices=("text", "json"), default="text")
    read_doc.set_defaults(func=cmd_read_doc)

    list_docs = sub.add_parser("list-docs", help="List workflow docs by bounded criteria.")
    list_docs.add_argument("--kind", choices=("all", "request", "backlog", "task"), default="all")
    list_docs.add_argument("--status", default=None)
    list_docs.add_argument("--ref-prefix", default=None)
    list_docs.add_argument("--limit", type=int, default=50)
    list_docs.add_argument("--recent", action="store_true", help="Sort by newest filesystem modification time first.")
    list_docs.add_argument("--open", action="store_true", dest="open_only", help="Only include workflow docs that are not terminal/closed.")
    list_docs.add_argument("--changed", action="store_true", help="Only include workflow docs changed in git, including untracked files.")
    list_docs.add_argument("--format", choices=("text", "json"), default="text")
    list_docs.set_defaults(func=cmd_list_docs)

    search_docs = sub.add_parser("search-docs", help="Search approved workflow docs with bounded snippets.")
    search_docs.add_argument("query")
    search_docs.add_argument("--kind", choices=("all", "request", "backlog", "task"), default="all")
    search_docs.add_argument("--status", default=None)
    search_docs.add_argument("--limit", type=int, default=20)
    search_docs.add_argument("--max-snippet-chars", type=int, default=240)
    search_docs.add_argument("--format", choices=("text", "json"), default="text")
    search_docs.set_defaults(func=cmd_search_docs)

    update_indicators = sub.add_parser("update-indicators", help="Update approved indicators on one workflow doc.")
    update_indicators.add_argument("source", help="Workflow ref or repo-relative path.")
    update_indicators.add_argument("--status")
    update_indicators.add_argument("--progress")
    update_indicators.add_argument("--understanding")
    update_indicators.add_argument("--confidence")
    update_indicators.add_argument("--theme")
    update_indicators.add_argument("--complexity")
    update_indicators.add_argument("--format", choices=("text", "json"), default="text")
    update_indicators.add_argument("--dry-run", action="store_true")
    update_indicators.set_defaults(func=cmd_update_indicators)

    append_note = sub.add_parser("append-note", help="Append a bounded note to an approved workflow section.")
    append_note.add_argument("source", help="Workflow ref or repo-relative path.")
    append_note.add_argument("--section", choices=("report", "validation", "decision"), required=True)
    append_note.add_argument("--text", required=True)
    append_note.add_argument("--format", choices=("text", "json"), default="text")
    append_note.add_argument("--dry-run", action="store_true")
    append_note.set_defaults(func=cmd_append_note)

    context_pack = sub.add_parser("context-pack", help="Build a compact context pack from workflow docs.")
    context_pack.add_argument("refs", nargs="+", help="Seed workflow ref(s) for the context pack.")
    context_pack.add_argument("--mode", choices=("summary-only", "diff-first", "full"), default="summary-only")
    context_pack.add_argument("--profile", choices=("tiny", "normal", "deep"), default="normal")
    context_pack.add_argument("--handoff", action="store_true", help="Include implementation handoff metadata, companion docs, and validation summary.")
    context_pack.add_argument("--out", help="Write the JSON artifact to this relative path.")
    context_pack.add_argument("--format", choices=("text", "json"), default="text")
    context_pack.add_argument("--dry-run", action="store_true")
    context_pack.set_defaults(func=cmd_context_pack)

    export_graph = sub.add_parser("export-graph", help="Export workflow relationships as a machine-readable graph.")
    export_graph.add_argument("--out", help="Write the JSON graph to this relative path.")
    export_graph.add_argument("--format", choices=("text", "json"), default="text")
    export_graph.add_argument("--dry-run", action="store_true")
    export_graph.set_defaults(func=cmd_export_graph)

    return parser


def _build_help() -> str:
    return "\n".join(
        [
            "Logics Sync CLI",
            "Manage workflow transitions and exports.",
            "",
            "Usage:",
            "  logics-manager sync <command> [args...]",
            "",
            "Commands:",
            "  close-eligible-requests",
            "    Auto-close requests when all linked backlog items are done.",
            "    Flags: --format {text,json}, --dry-run",
            "",
            "  refresh-mermaid-signatures",
            "    Refresh stale Mermaid signatures without rewriting diagram bodies.",
            "    Args: [refs-or-paths...]",
            "    Flags: --changed-only, --format {text,json}, --dry-run",
            "",
            "  schema-status [sources...]",
            "    Report schema-version coverage for selected workflow docs.",
            "    Flags: --format {text,json}",
            "",
            "  context-pack <refs...>",
            "    Build a compact JSON context pack from workflow docs.",
            "    Flags: --mode {summary-only,diff-first,full}, --profile {tiny,normal,deep}, --out, --format {text,json}, --dry-run",
            "",
            "  read-doc <source>",
            "    Read a bounded workflow document payload by ref or path.",
            "    Flags: --max-chars, --section, --format {text,json}",
            "",
            "  list-docs",
            "    List workflow docs by bounded criteria.",
            "    Flags: --kind {all,request,backlog,task}, --status, --ref-prefix, --limit, --recent, --open, --changed, --format {text,json}",
            "",
            "  search-docs <query>",
            "    Search approved workflow docs with bounded snippets.",
            "    Flags: --kind {all,request,backlog,task}, --status, --limit, --max-snippet-chars, --format {text,json}",
            "",
            "  update-indicators <source>",
            "    Update approved indicators on one workflow doc.",
            "    Flags: --status, --progress, --understanding, --confidence, --theme, --complexity, --format {text,json}, --dry-run",
            "",
            "  append-note <source>",
            "    Append a bounded note to an approved workflow section.",
            "    Flags: --section {report,validation,decision}, --text, --format {text,json}, --dry-run",
            "",
            "  export-graph",
            "    Export workflow relationships as a machine-readable graph.",
            "    Flags: --out, --format {text,json}, --dry-run",
            "",
            "Examples:",
            "  logics-manager sync schema-status",
            "  logics-manager sync list-docs --open --recent --limit 10 --format json",
            "  logics-manager sync context-pack req_001_my_request task_002_fix_bug --handoff --out logics/context-pack.json",
            "  logics-manager sync export-graph --format json",
        ]
    )


def _build_subcommand_help(command: str) -> str:
    if command == "close-eligible-requests":
        return "\n".join(
            [
                "Logics Sync Close Eligible Requests",
                "Auto-close requests when all linked backlog items are done.",
                "",
                "Usage:",
                "  logics-manager sync close-eligible-requests [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --dry-run",
                "",
                "Example:",
                "  logics-manager sync close-eligible-requests --dry-run",
            ]
        )
    if command == "refresh-mermaid-signatures":
        return "\n".join(
            [
                "Logics Sync Refresh Mermaid Signatures",
                "Refresh stale workflow Mermaid signatures without rewriting diagram bodies.",
                "",
                "Usage:",
                "  logics-manager sync refresh-mermaid-signatures [refs-or-paths...] [args...]",
                "",
                "Flags:",
                "  --changed-only",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "schema-status":
        return "\n".join(
            [
                "Logics Sync Schema Status",
                "Report schema-version coverage for workflow docs.",
                "",
                "Usage:",
                "  logics-manager sync schema-status [sources...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "",
                "Example:",
                "  logics-manager sync schema-status logics/request",
            ]
        )
    if command == "context-pack":
        return "\n".join(
            [
                "Logics Sync Context Pack",
                "Build a compact JSON context pack from workflow docs.",
                "",
                "Usage:",
                "  logics-manager sync context-pack <refs...> [args...]",
                "",
                "Flags:",
                "  --mode {summary-only,diff-first,full}",
                "  --profile {tiny,normal,deep}",
                "  --out",
                "  --format {text,json}",
                "  --dry-run",
                "",
                "Example:",
                "  logics-manager sync context-pack req_001_my_request task_002_fix_bug --out logics/context-pack.json",
            ]
        )
    if command == "read-doc":
        return "\n".join(
            [
                "Logics Sync Read Doc",
                "Read a bounded workflow document payload by ref or path.",
                "",
                "Usage:",
                "  logics-manager sync read-doc <source> [args...]",
                "",
                "Flags:",
                "  --max-chars",
                "  --section",
                "  --format {text,json}",
            ]
        )
    if command == "list-docs":
        return "\n".join(
            [
                "Logics Sync List Docs",
                "List workflow docs by bounded criteria.",
                "",
                "Usage:",
                "  logics-manager sync list-docs [args...]",
                "",
                "Flags:",
                "  --kind {all,request,backlog,task}",
                "  --status",
                "  --ref-prefix",
                "  --limit",
                "  --recent",
                "  --open",
                "  --changed",
                "  --format {text,json}",
                "",
                "Examples:",
                "  logics-manager sync list-docs --open --recent --limit 10",
                "  logics-manager sync list-docs --changed --format json",
            ]
        )
    if command == "search-docs":
        return "\n".join(
            [
                "Logics Sync Search Docs",
                "Search approved workflow docs with bounded snippets.",
                "",
                "Usage:",
                "  logics-manager sync search-docs <query> [args...]",
                "",
                "Flags:",
                "  --kind {all,request,backlog,task}",
                "  --status",
                "  --limit",
                "  --max-snippet-chars",
                "  --format {text,json}",
            ]
        )
    if command == "update-indicators":
        return "\n".join(
            [
                "Logics Sync Update Indicators",
                "Update approved indicators on one workflow doc.",
                "",
                "Usage:",
                "  logics-manager sync update-indicators <source> [args...]",
                "",
                "Flags:",
                "  --status",
                "  --progress",
                "  --understanding",
                "  --confidence",
                "  --theme",
                "  --complexity",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "append-note":
        return "\n".join(
            [
                "Logics Sync Append Note",
                "Append a bounded note to an approved workflow section.",
                "",
                "Usage:",
                "  logics-manager sync append-note <source> --section <section> --text <text> [args...]",
                "",
                "Flags:",
                "  --section {report,validation,decision}",
                "  --text",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "export-graph":
        return "\n".join(
            [
                "Logics Sync Export Graph",
                "Export workflow relationships as a machine-readable graph.",
                "",
                "Usage:",
                "  logics-manager sync export-graph [args...]",
                "",
                "Flags:",
                "  --out",
                "  --format {text,json}",
                "  --dry-run",
                "",
                "Example:",
                "  logics-manager sync export-graph --format json",
            ]
        )
    return _build_help()


def _print_help(text: str) -> None:
    print(colorize_help(text))


def cmd_close_eligible_requests(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    scanned, closed = _close_eligible_requests(repo_root, args.dry_run, quiet=args.format == "json")
    payload = {
        "command": "sync",
        "kind": "close-eligible-requests",
        "repo_root": repo_root.as_posix(),
        "scanned": scanned,
        "closed": closed,
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Scanned {scanned} request(s); closed {closed}.")
    return payload


def cmd_refresh_mermaid_signatures(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    modified: list[str] = []
    if args.changed_only:
        changed_sources = [
            path
            for path in _git_changed_paths(repo_root)
            if path.startswith(("logics/request/", "logics/backlog/", "logics/tasks/")) and path.endswith(".md")
        ]
        targets = _resolve_target_docs(repo_root, changed_sources)
    else:
        targets = _resolve_target_docs(repo_root, args.sources)
    for kind, path in targets:
        if refresh_workflow_mermaid_signature_file(path, kind, args.dry_run, repo_root=repo_root):
            modified.append(path.relative_to(repo_root).as_posix())

    payload = {
        "command": "sync",
        "kind": "refresh-mermaid-signatures",
        "repo_root": repo_root.as_posix(),
        "modified_files": modified,
        "scanned_files": [path.relative_to(repo_root).as_posix() for _kind, path in targets],
        "changed_only": args.changed_only,
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        if args.dry_run:
            print(f"Dry run: {len(modified)} Mermaid signature update(s) would be applied.")
        else:
            print(f"Refreshed Mermaid signatures in {len(modified)} workflow doc(s).")
        for rel_path in modified:
            print(f"- {rel_path}")
    return payload


def cmd_schema_status(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = _schema_status(repo_root, args.sources)
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Schema status: {payload['doc_count']} workflow doc(s) scanned.")
        for version, count in payload["counts"].items():
            print(f"- {version}: {count}")
    return {"command": "sync", "kind": "schema-status", "repo_root": repo_root.as_posix(), **payload}


def _bounded_positive(value: int, *, default: int, maximum: int) -> int:
    if value <= 0:
        return default
    return min(value, maximum)


def cmd_read_doc(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = read_logics_doc_payload(repo_root, args.source, max_chars=_bounded_positive(args.max_chars, default=4000, maximum=12000), sections=args.section or None)
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"{payload['ref']} ({payload['kind']}): {payload['title']}")
        print(f"- path: {payload['path']}")
        print(f"- status: {payload['status']}")
        print(f"- truncated: {payload['truncated']}")
        print("")
        print(str(payload["content"]).rstrip())
    return {"command": "sync", "kind": "read-doc", "repo_root": repo_root.as_posix(), **payload}


def cmd_list_docs(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = list_logics_docs_payload(
        repo_root,
        kind=args.kind,
        status=args.status,
        ref_prefix=args.ref_prefix,
        limit=_bounded_positive(args.limit, default=50, maximum=200),
        recent=args.recent,
        open_only=args.open_only,
        changed=args.changed,
    )
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Workflow docs ({payload['view']}): {payload['returned_count']} returned of {payload['total_count']}")
        for item in payload["items"]:
            print(f"- {item['ref']} [{item['status']}]: {item['title']}")
    return {"command": "sync", "kind": "list-docs", "repo_root": repo_root.as_posix(), **payload}


def cmd_search_docs(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = search_logics_docs_payload(
        repo_root,
        args.query,
        kind=args.kind,
        status=args.status,
        limit=_bounded_positive(args.limit, default=20, maximum=100),
        max_snippet_chars=_bounded_positive(args.max_snippet_chars, default=240, maximum=1000),
    )
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Search `{payload['query']}`: {payload['returned_count']} match(es)")
        for match in payload["matches"]:
            print(f"- {match['ref']}:{match['line']} {match['title']}")
    return {"command": "sync", "kind": "search-docs", "repo_root": repo_root.as_posix(), **payload}


def cmd_update_indicators(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    indicators = {
        "Status": args.status,
        "Progress": args.progress,
        "Understanding": args.understanding,
        "Confidence": args.confidence,
        "Theme": args.theme,
        "Complexity": args.complexity,
    }
    payload = update_workflow_indicators_payload(repo_root, args.source, {key: value for key, value in indicators.items() if value is not None}, dry_run=args.dry_run)
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Updated indicators for {payload['path']} (changed: {payload['changed']}).")
    return {"command": "sync", "kind": "update-indicators", "repo_root": repo_root.as_posix(), **payload}
