

def cmd_append_note(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = append_workflow_note_payload(repo_root, args.source, note_kind=args.section, text=args.text, dry_run=args.dry_run)
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Appended {args.section} note to {payload['path']} (changed: {payload['changed']}).")
        if payload.get("mermaid_signature_refreshed"):
            print("- Mermaid signature refreshed.")
    return {"command": "sync", "kind": "append-note", "repo_root": repo_root.as_posix(), **payload}


def cmd_context_pack(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    profile = "deep" if args.handoff and args.profile == "normal" else args.profile
    payload = _build_context_pack(repo_root, ",".join(args.refs), mode=args.mode, profile=profile, config=None, handoff=args.handoff)
    if args.out:
        out_path, output_path = resolve_repo_output_path(repo_root, args.out)
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(serialized, encoding="utf-8")
        payload["output_path"] = output_path
        if args.format == "json":
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"Wrote {output_path}")
    else:
        if args.format == "json":
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"Context pack: {', '.join(args.refs)} ({payload['mode']}, {payload['profile']})")
            print(f"- docs: {payload['estimates']['doc_count']}")
    return {"command": "sync", "kind": "context-pack", "repo_root": repo_root.as_posix(), **payload}


def cmd_export_graph(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = _graph_payload(repo_root, config=None)
    payload["repo_root"] = repo_root.as_posix()
    if args.out:
        out_path, output_path = resolve_repo_output_path(repo_root, args.out)
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(serialized, encoding="utf-8")
        payload["output_path"] = output_path
        if args.format == "json":
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"Wrote {output_path}")
    else:
        if args.format == "json":
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"Graph: {len(payload['nodes'])} node(s), {len(payload['edges'])} edge(s).")
    return {"command": "sync", "kind": "export-graph", "repo_root": repo_root.as_posix(), **payload}


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help"):
        _print_help(_build_help())
        return 0
    if argv[0] in {"close-eligible-requests", "refresh-mermaid-signatures", "schema-status", "read-doc", "list-docs", "search-docs", "update-indicators", "append-note", "context-pack", "export-graph"} and len(argv) > 1 and argv[1] in ("-h", "--help"):
        _print_help(_build_subcommand_help(argv[0]))
        return 0
    parser = build_parser()
    args = parser.parse_args(argv)
    payload = args.func(args)
    return 0 if isinstance(payload, dict) else 1
