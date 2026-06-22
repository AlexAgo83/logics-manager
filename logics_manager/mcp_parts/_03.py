def call_tool(name: str, arguments: dict[str, Any] | None = None, *, repo_root: Path | None = None) -> dict[str, Any]:
    root = _repo_root(repo_root)
    args = arguments or {}
    if name not in TOOLS_BY_NAME:
        raise McpToolError("unsupported_action", f"Unsupported MCP tool: {name}")
    _validate_arguments(name, args)

    if name == "run_logics_lint":
        status = _lint_status(root)
        return {"ok": bool(status["ok"]), "status": status}
    if name == "run_logics_audit":
        status = _audit_status(root)
        return {"ok": bool(status["ok"]), "status": status}
    if name == "list_active_work":
        kind = str(args.get("kind") or "all")
        if kind not in {"all", "request", "backlog", "task"}:
            raise McpToolError("invalid_argument_value", "Unsupported list kind.", details={"kind": kind, "allowed": ["all", "request", "backlog", "task"]})
        return {"ok": True, "items": flow_list_payload(root, kind=kind)["entries"]}
    if name == "list_companion_docs":
        payload = _list_companion_docs(root, kind=str(args.get("kind") or "all"), limit=_bounded_int(args.get("limit"), default=50, maximum=200))
        return {"ok": True, **payload}
    if name == "read_logics_doc":
        try:
            payload = read_logics_doc_payload(root, str(args.get("source") or ""), max_chars=_bounded_int(args.get("max_chars"), default=4000, maximum=12000), sections=args.get("sections") if isinstance(args.get("sections"), list) else None)
        except SystemExit as exc:
            raise _mcp_read_error(exc) from exc
        return {"ok": True, **payload}
    if name == "build_context_pack":
        try:
            payload = build_context_pack_payload(root, str(args.get("ref") or ""), mode=str(args.get("mode") or "summary-only"), profile=str(args.get("profile") or "normal"), config=None)
        except SystemExit as exc:
            raise _mcp_read_error(exc) from exc
        return {"ok": True, **payload}
    if name == "get_release_status":
        return release_status_payload(root)
    if name == "get_release_plan":
        version = str(args.get("version") or "").strip()
        if not version:
            raise McpToolError("missing_required_argument", "version is required.", details={"argument": "version"})
        return release_plan_payload(root, version)
    if name == "list_logics_docs":
        payload = list_logics_docs_payload(
            root,
            kind=str(args.get("kind") or "all"),
            status=str(args["status"]) if args.get("status") else None,
            ref_prefix=str(args["ref_prefix"]) if args.get("ref_prefix") else None,
            limit=_bounded_int(args.get("limit"), default=50, maximum=200),
        )
        return {"ok": True, **payload}
    if name == "search_logics_docs":
        try:
            payload = search_logics_docs_payload(
                root,
                str(args.get("query") or ""),
                kind=str(args.get("kind") or "all"),
                status=str(args["status"]) if args.get("status") else None,
                limit=_bounded_int(args.get("limit"), default=20, maximum=100),
                max_snippet_chars=_bounded_int(args.get("max_snippet_chars"), default=240, maximum=1000),
            )
        except SystemExit as exc:
            raise _mcp_read_error(exc) from exc
        return {"ok": True, **payload}
    if name == "get_logics_status":
        return status_payload(root, limit=_bounded_int(args.get("limit"), default=10, maximum=100))
    if name == "get_logics_health":
        return health_payload(root, limit=_bounded_int(args.get("limit"), default=10, maximum=100))
    if name == "list_logics_followups":
        include_closed = bool(args.get("include_closed", False))
        closed_only = bool(args.get("closed_only", False))
        if include_closed and closed_only:
            raise McpToolError("invalid_argument_value", "include_closed and closed_only are mutually exclusive.", details={"arguments": ["include_closed", "closed_only"]})
        return followups_payload(
            root,
            limit=_bounded_int(args.get("limit"), default=50, maximum=200),
            source_kind=str(args.get("source_kind") or "all"),
            include_closed=include_closed,
            closed_only=closed_only,
        )
    if name == "check_product_consistency":
        return product_consistency_payload(root, limit=_bounded_int(args.get("limit"), default=50, maximum=200))
    if name == "finish_task":
        rel_path = _relative_path(root, str(args.get("task_path") or ""), ("logics/tasks",))
        dry_run = bool(args.get("dry_run", False))
        if not dry_run:
            _ensure_no_dirty_conflict(root, ["logics"])
        command = ["flow", "finish", "task", rel_path.as_posix(), "--format", "json"]
        if dry_run:
            command.append("--dry-run")
        payload = _json_from_stdout(_run_command(root, command).stdout)
        return _workflow_write_result(root, {"source_path": payload["source"], "dry_run": payload["dry_run"], "summary": f"Finished task {Path(payload['source']).stem}"}, paths=None if not dry_run else [rel_path.as_posix()])
    if name == "close_workflow_doc":
        kind = str(args.get("kind") or "")
        allowed_dir = {"request": "logics/request", "backlog": "logics/backlog", "task": "logics/tasks"}[kind]
        rel_path = _relative_path(root, str(args.get("source_path") or ""), (allowed_dir,))
        dry_run = bool(args.get("dry_run", False))
        if not dry_run:
            _ensure_no_dirty_conflict(root, ["logics"])
        command = ["flow", "close", kind, rel_path.as_posix(), "--format", "json"]
        if dry_run:
            command.append("--dry-run")
        payload = _json_from_stdout(_run_command(root, command).stdout)
        return _workflow_write_result(root, {"kind": payload["kind"], "source_path": payload["source"], "dry_run": payload["dry_run"], "summary": f"Closed {kind} {Path(payload['source']).stem}"}, paths=None if not dry_run else [rel_path.as_posix()])
    if name == "close_eligible_requests":
        dry_run = bool(args.get("dry_run", False))
        if not dry_run:
            _ensure_no_dirty_conflict(root, ["logics"])
        command = ["sync", "close-eligible-requests", "--format", "json"]
        if dry_run:
            command.append("--dry-run")
        payload = _json_from_stdout(_run_command(root, command).stdout)
        return _workflow_write_result(root, payload)
    if name == "refresh_mermaid_signatures":
        dry_run = bool(args.get("dry_run", False))
        if not dry_run:
            _ensure_no_dirty_conflict(root, ["logics"])
        command = ["sync", "refresh-mermaid-signatures", "--format", "json"]
        if dry_run:
            command.append("--dry-run")
        payload = _json_from_stdout(_run_command(root, command).stdout)
        paths = [str(path) for path in payload.get("modified_files", [])] or None
        return _workflow_write_result(root, payload, paths=paths)
    if name == "update_workflow_indicators":
        source = str(args.get("source") or "")
        dry_run = bool(args.get("dry_run", False))
        rel_path = _workflow_doc_path_for_source(root, source)
        if not dry_run:
            _ensure_no_dirty_conflict(root, [rel_path])
        indicators = {
            "Status": args.get("status"),
            "Progress": args.get("progress"),
            "Understanding": args.get("understanding"),
            "Confidence": args.get("confidence"),
            "Theme": args.get("theme"),
            "Complexity": args.get("complexity"),
        }
        try:
            payload = update_workflow_indicators_payload(root, source, {key: str(value) for key, value in indicators.items() if value is not None}, dry_run=dry_run)
        except SystemExit as exc:
            raise _mcp_mutation_error(exc) from exc
        return _workflow_write_result(root, payload, paths=[rel_path])
    if name in {"append_report_entry", "append_validation_note", "append_decision_note"}:
        source = str(args.get("source") or "")
        dry_run = bool(args.get("dry_run", False))
        rel_path = _workflow_doc_path_for_source(root, source)
        if not dry_run:
            _ensure_no_dirty_conflict(root, [rel_path])
        note_kind = {"append_report_entry": "report", "append_validation_note": "validation", "append_decision_note": "decision"}[name]
        try:
            payload = append_workflow_note_payload(root, source, note_kind=note_kind, text=str(args.get("text") or ""), dry_run=dry_run)
        except SystemExit as exc:
            raise _mcp_mutation_error(exc) from exc
        return _workflow_write_result(root, payload, paths=[rel_path])
    if name == "split_request":
        rel_path = _relative_path(root, str(args.get("request_path") or ""), ("logics/request",))
        titles = _nonempty_titles(args.get("titles"))
        dry_run = bool(args.get("dry_run", False))
        if not dry_run:
            _ensure_no_dirty_conflict(root, [rel_path.as_posix()])
        command = ["flow", "split", "request", rel_path.as_posix(), "--format", "json"]
        for title in titles:
            command.extend(["--title", title])
        if dry_run:
            command.append("--dry-run")
        payload = _json_from_stdout(_run_command(root, command).stdout)
        created_paths = [f"logics/backlog/{ref}.md" for ref in payload.get("created_refs", [])]
        return _workflow_write_result(root, {"created_paths": created_paths, **payload}, paths=[rel_path.as_posix(), *created_paths])
    if name == "split_backlog":
        rel_path = _relative_path(root, str(args.get("backlog_path") or ""), ("logics/backlog",))
        titles = _nonempty_titles(args.get("titles"))
        dry_run = bool(args.get("dry_run", False))
        if not dry_run:
            _ensure_no_dirty_conflict(root, [rel_path.as_posix()])
        command = ["flow", "split", "backlog", rel_path.as_posix(), "--format", "json"]
        for title in titles:
            command.extend(["--title", title])
        if dry_run:
            command.append("--dry-run")
        payload = _json_from_stdout(_run_command(root, command).stdout)
        created_paths = [f"logics/tasks/{ref}.md" for ref in payload.get("created_refs", [])]
        return _workflow_write_result(root, {"created_paths": created_paths, **payload}, paths=[rel_path.as_posix(), *created_paths])
    if name in {"autofix_ac_traceability", "autofix_structure"}:
        raw_paths = args.get("paths") if isinstance(args.get("paths"), list) else []
        paths = [_relative_path(root, str(path), ("logics",)).as_posix() for path in raw_paths]
        refs = [str(ref).strip() for ref in args.get("refs", []) if str(ref).strip()] if isinstance(args.get("refs"), list) else []
        _ensure_no_dirty_conflict(root, paths or ["logics"])
        flag = "--autofix-ac-traceability" if name == "autofix_ac_traceability" else "--autofix-structure"
        command = ["audit", flag, "--format", "json"]
        if paths:
            command.append("--paths")
            command.extend(paths)
        if refs:
            command.append("--refs")
            command.extend(refs)
        payload = _run_json_command(root, command)
        modified = [str(path) for path in payload.get("autofix", {}).get("modified_files", [])]
        return _workflow_write_result(root, {"audit_payload": payload, "modified_paths": modified}, paths=modified or paths or None)
    if name == "show_git_diff":
        raw_paths = args.get("paths")
        paths = [str(path) for path in raw_paths] if isinstance(raw_paths, list) else None
        return _show_git_diff(root, paths)
    if name == "delete_logics_file":
        rel_path, target = _resolved_markdown_file_path(root, str(args.get("path") or ""))
        dry_run = bool(args.get("dry_run", False))
        if not target.exists():
            raise McpToolError("not_found", "Logics file not found.", details={"path": rel_path.as_posix()})
        if not target.is_file() or target.is_symlink():
            raise McpToolError("invalid_path", "Only regular Markdown files can be deleted.", details={"path": rel_path.as_posix()})
        if not dry_run:
            _ensure_no_dirty_conflict(root, [rel_path.as_posix()])
            target.unlink()
        return _workflow_write_result(
            root,
            {
                "path": rel_path.as_posix(),
                "dry_run": dry_run,
                "deleted": not dry_run,
                "would_delete": dry_run,
                "summary": f"{'Would delete' if dry_run else 'Deleted'} {rel_path.as_posix()}",
            },
            paths=[rel_path.as_posix()],
        )
    if name == "rename_logics_file":
        source_rel, source = _resolved_markdown_file_path(root, str(args.get("source_path") or ""))
        destination_rel, destination = _resolved_markdown_file_path(root, str(args.get("destination_path") or ""))
        dry_run = bool(args.get("dry_run", False))
        if source_rel == destination_rel:
            raise McpToolError("invalid_path", "Source and destination paths must differ.", details={"source_path": source_rel.as_posix(), "destination_path": destination_rel.as_posix()})
        if not source.exists():
            raise McpToolError("not_found", "Source Logics file not found.", details={"source_path": source_rel.as_posix()})
        if not source.is_file() or source.is_symlink():
            raise McpToolError("invalid_path", "Only regular Markdown files can be renamed.", details={"source_path": source_rel.as_posix()})
        if destination.exists():
            raise McpToolError("already_exists", "Destination already exists.", details={"destination_path": destination_rel.as_posix()})
        if not dry_run:
            _ensure_no_dirty_conflict(root, [source_rel.as_posix(), destination_rel.as_posix()])
            destination.parent.mkdir(parents=True, exist_ok=True)
            source.rename(destination)
        return _workflow_write_result(
            root,
            {
                "source_path": source_rel.as_posix(),
                "destination_path": destination_rel.as_posix(),
                "dry_run": dry_run,
                "renamed": not dry_run,
                "would_rename": dry_run,
                "summary": f"{'Would rename' if dry_run else 'Renamed'} {source_rel.as_posix()} to {destination_rel.as_posix()}",
            },
            paths=[source_rel.as_posix(), destination_rel.as_posix()],
        )

    if name == "create_request":
        title = str(args.get("title") or "").strip()
        if not title:
            raise McpToolError("missing_required_argument", "title is required.", details={"argument": "title"})
        command = ["flow", "new", "request", "--title", title, "--format", "json"]
        if args.get("theme"):
            command.extend(["--theme", str(args["theme"])])
        if args.get("complexity"):
            command.extend(["--complexity", str(args["complexity"])])
        payload = _created_doc_from_stdout(_run_command(root, command).stdout, command="new", kind="request")
        _update_created_request(root, str(payload["path"]), args)
        return {
            "ok": True,
            "path": payload["path"],
            "ref": payload["ref"],
            "summary": f"Created request {payload['ref']}",
            "document_preview": _document_preview(root, str(payload["path"])),
            "next_suggested_tool": "promote_request_to_backlog",
            **_validation_result(root),
            **_show_git_diff(root, [str(payload["path"])]),
        }

    if name == "promote_request_to_backlog":
        rel_path = _relative_path(root, str(args.get("request_path") or ""), ("logics/request",))
        _ensure_no_dirty_conflict(root, [rel_path.as_posix()])
        payload = _json_from_stdout(_run_command(root, ["flow", "promote", "request-to-backlog", rel_path.as_posix(), "--format", "json"]).stdout)
        return {
            "ok": True,
            "source_path": payload["source"],
            "created_path": payload["created_path"],
            "created_ref": payload["created_ref"],
            "document_preview": _document_preview(root, str(payload["created_path"])),
            "next_suggested_tool": "promote_backlog_to_task",
            **_validation_result(root),
            **_show_git_diff(root, [str(payload["source"]), str(payload["created_path"])]),
        }

    if name == "promote_backlog_to_task":
        rel_path = _relative_path(root, str(args.get("backlog_path") or ""), ("logics/backlog",))
        _ensure_no_dirty_conflict(root, [rel_path.as_posix()])
        payload = _json_from_stdout(_run_command(root, ["flow", "promote", "backlog-to-task", rel_path.as_posix(), "--format", "json"]).stdout)
        return {
            "ok": True,
            "source_path": payload["source"],
            "created_path": payload["created_path"],
            "created_ref": payload["created_ref"],
            "document_preview": _document_preview(root, str(payload["created_path"])),
            "next_suggested_tool": "run_logics_lint",
            **_validation_result(root),
            **_show_git_diff(root, [str(payload["source"]), str(payload["created_path"])]),
        }

    if name in {"create_product_brief", "create_architecture_decision"}:
        title = str(args.get("title") or "").strip()
        if not title:
            raise McpToolError("missing_required_argument", "title is required.", details={"argument": "title"})
        companion_kind = "product" if name == "create_product_brief" else "architecture"
        command = ["flow", "companion", companion_kind, "--title", title, "--format", "json"]
        ref_args = (
            ("request_path", "--request-ref", "logics/request"),
            ("backlog_path", "--backlog-ref", "logics/backlog"),
            ("task_path", "--task-ref", "logics/tasks"),
        )
        linked_refs: dict[str, str] = {}
        for key, flag, directory in ref_args:
            if args.get(key):
                rel_path = _relative_path(root, str(args[key]), (directory,))
                ref = _flow_path_ref(rel_path.as_posix())
                if ref:
                    command.extend([flag, ref])
                    linked_refs[key] = rel_path.as_posix()
        payload = _json_from_stdout(_run_command(root, command).stdout)
        return {
            "ok": True,
            "path": payload["path"],
            "ref": payload["ref"],
            "linked_refs": linked_refs,
            "document_preview": _document_preview(root, str(payload["path"])),
            "next_suggested_tool": "run_logics_lint",
            **_validation_result(root, include_audit=True),
            **_show_git_diff(root, [str(payload["path"])]),
        }

    raise McpToolError("unsupported_action", f"Unsupported MCP tool: {name}")


def mcp_result(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "content": [{"type": "text", "text": json.dumps(payload, indent=2, sort_keys=True)}],
        "structuredContent": payload,
        "isError": not bool(payload.get("ok", True)),
    }


def handle_jsonrpc(message: dict[str, Any], *, repo_root: Path | None = None) -> dict[str, Any] | None:
    method = message.get("method")
    request_id = message.get("id")
    if method == "notifications/initialized":
        return None
    try:
        if method == "initialize":
            result = {
                "protocolVersion": "2025-06-18",
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "logics-manager", "version": _server_version()},
            }
        elif method == "tools/list":
            result = {"tools": TOOL_DEFINITIONS}
        elif method == "tools/call":
            params = message.get("params") if isinstance(message.get("params"), dict) else {}
            name = str(params.get("name") or "")
            arguments = params.get("arguments") if isinstance(params.get("arguments"), dict) else {}
            result = mcp_result(call_tool(name, arguments, repo_root=repo_root))
        else:
            raise McpToolError("unsupported_action", f"Unsupported JSON-RPC method: {method}")
        if request_id is None:
            return None
        return {"jsonrpc": JSONRPC_VERSION, "id": request_id, "result": result}
    except McpToolError as exc:
        error_payload = exc.to_payload()
        if method == "tools/call" and request_id is not None:
            return {"jsonrpc": JSONRPC_VERSION, "id": request_id, "result": mcp_result(error_payload)}
        return {"jsonrpc": JSONRPC_VERSION, "id": request_id, "error": {"code": -32000, "message": exc.message, "data": error_payload}}


def serve_stdio(*, repo_root: Path | None = None) -> int:
    root = _repo_root(repo_root)
    for line in sys.stdin:
        stripped = line.strip()
        if not stripped:
            continue
        try:
            message = json.loads(stripped)
            if not isinstance(message, dict):
                raise ValueError("JSON-RPC message must be an object.")
            response = handle_jsonrpc(message, repo_root=root)
        except Exception as exc:
            response = {"jsonrpc": JSONRPC_VERSION, "id": None, "error": {"code": -32700, "message": str(exc)}}
        if response is not None:
            print(json.dumps(response, separators=(",", ":")), flush=True)
    return 0


