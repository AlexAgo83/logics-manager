            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            return

    def _bearer_token(self, parsed: Any) -> str:
        header = self.headers.get("Authorization", "")
        if header.lower().startswith("bearer "):
            return header.split(" ", 1)[1].strip()
        return (parse_qs(parsed.query).get("t") or [""])[0]

    def _lan_auth_passes(self, parsed: Any, *, method: str = "GET") -> bool:
        token = self.server.lan_token
        if not token:
            return True
        if self._client_is_loopback():
            return True
        if method == "GET" and self._is_public_get_route(parsed.path):
            return True
        candidate = self._bearer_token(parsed)
        if candidate and hmac.compare_digest(candidate, token):
            return True
        if self.server.device_registry is not None and self.server.device_registry.find_matching(candidate) is not None:
            return True
        return False

    def _paired_device_for_request(self, parsed: Any) -> _PairedDevice | None:
        registry = self.server.device_registry
        if registry is None:
            return None
        candidate = self._bearer_token(parsed)
        if not candidate:
            return None
        return registry.find_matching(candidate)

    def _send_lan_unauthorized(self) -> None:
        body = _json_bytes({"ok": False, "error": "LAN viewer requires a bearer token. Open the share URL from the launch banner."})
        try:
            self.send_response(HTTPStatus.UNAUTHORIZED)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("WWW-Authenticate", 'Bearer realm="logics-viewer"')
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            return

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if not self._lan_auth_passes(parsed, method="GET"):
            self._send_lan_unauthorized()
            return
        route = parsed.path
        if route == "/api/lan/devices":
            registry = self.server.device_registry
            payload = registry.list_payload() if registry is not None else []
            self._send_json({"ok": True, "payload": payload})
            return
        if route == "/":
            self._serve_file(VIEWER_ROOT / "index.html", root=VIEWER_ROOT)
            return
        if route == "/browser-host.js":
            self._serve_file(VIEWER_ROOT / "browser-host.js", root=VIEWER_ROOT)
            return
        if route == "/viewer.css":
            self._serve_file(VIEWER_ROOT / "viewer.css", root=VIEWER_ROOT)
            return
        if route == "/vendor/mermaid.min.js":
            vendor_path = DIST_VENDOR_ROOT / "mermaid.min.js"
            vendor_root = DIST_VENDOR_ROOT
            if not vendor_path.is_file():
                vendor_path = NODE_MERMAID_ROOT / "mermaid.min.js"
                vendor_root = NODE_MERMAID_ROOT
            if not vendor_path.is_file():
                vendor_path = PACKAGE_VENDOR_ROOT / "mermaid.min.js"
                vendor_root = PACKAGE_VENDOR_ROOT
            self._serve_file(vendor_path, root=vendor_root)
            return
        if route.startswith("/media/"):
            media_path = (SHARED_MEDIA_ROOT / route.removeprefix("/media/")).resolve()
            if SHARED_MEDIA_ROOT.resolve() != media_path and SHARED_MEDIA_ROOT.resolve() not in media_path.parents:
                self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
                return
            self._serve_file(media_path, root=SHARED_MEDIA_ROOT)
            return
        if route == "/api/items":
            self._send_json(
                {
                    "ok": True,
                    "payload": self.server.viewer_payload(),
                }
            )
            return
        if route == "/api/projects":
            self._send_json({"ok": True, "payload": {"projects": self.server.project_registry_payload()}})
            return
        if route == "/api/doc":
            rel_path = parse_qs(parsed.query).get("path", [""])[0]
            try:
                self._send_json({"ok": True, "document": read_doc_payload(self.server.repo_root, rel_path)})
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            return
        if route == "/api/lint":
            self._send_json({"ok": True, "payload": lint_payload(self.server.repo_root)})
            return
        if route == "/api/audit":
            self._send_json({"ok": True, "payload": audit_payload(self.server.repo_root)})
            return
        if route == "/api/capabilities":
            self._send_json({"ok": True, "payload": viewer_project_capabilities(self.server.repo_root)})
            return
        if route == "/api/events":
            self._stream_viewer_events()
            return
        if route == "/api/git-status":
            self._send_status_json("git-status", lambda: self._status_component("git"))
            return
        if route == "/api/ci-status":
            self._send_status_json("ci-status", lambda: self._status_component("ci"))
            return
        if route == "/api/release-status":
            self._send_status_json("release-status", lambda: self._status_component("release"))
            return
        if route == "/api/release-runs":
            self._send_status_json("release-runs", lambda: self._status_component("releaseRuns"))
            return
        if route == "/api/cdx-status":
            self._send_status_json("cdx-status", lambda: self._status_component("cdx"))
            return
        if route == "/api/cdx-runs":
            self._send_status_json("cdx-runs", lambda: self._status_component("cdxRuns"))
            return
        if route == "/api/cdx-history":
            self._send_status_json("cdx-history", lambda: self._status_component("cdxHistory"))
            return
        if route == "/api/status":
            self._send_status_json(
                "status",
                lambda: {
                    "git": self._status_component("git"),
                    "ci": self._status_component("ci"),
                    "releaseRuns": self._status_component("releaseRuns"),
                    "cdx": self._status_component("cdx"),
                    "cdxRuns": self._status_component("cdxRuns"),
                },
            )
            return
        if route == "/api/cdx-run-report":
            run_id = parse_qs(parsed.query).get("runId", [""])[0]
            self._send_json({"ok": True, "payload": cdx_run_report_payload(self.server.repo_root, run_id)})
            return
        if route == "/api/git-diff":
            params = parse_qs(parsed.query)
            rel_path = params.get("path", [""])[0]
            cached = params.get("cached", [""])[0].lower() in {"1", "true", "yes"}
            self._send_json({"ok": True, "payload": git_diff_payload(self.server.repo_root, rel_path, cached=cached)})
            return
        if route == "/api/git-file-preview":
            params = parse_qs(parsed.query)
            rel_path = params.get("path", [""])[0]
            full = params.get("full", [""])[0].lower() in {"1", "true", "yes"}
            self._send_json({"ok": True, "payload": git_file_preview_payload(self.server.repo_root, rel_path, full=full)})
            return
        if route == "/api/workspace-tree":
            rel_path = parse_qs(parsed.query).get("path", [""])[0]
            try:
                self._send_json({"ok": True, "payload": workspace_tree_payload(self.server.repo_root, rel_path)})
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if route == "/api/workspace-preview":
            params = parse_qs(parsed.query)
            rel_path = params.get("path", [""])[0]
            full = params.get("full", [""])[0].lower() in {"1", "true", "yes"}
            try:
                self._send_json({"ok": True, "payload": workspace_preview_payload(self.server.repo_root, rel_path, full=full)})
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if route == "/api/project-picker-tree":
            params = parse_qs(parsed.query, keep_blank_values=True)
            rel_path = params.get("path", [self.server.project_picker_initial_path])[0]
            try:
                self._send_json({"ok": True, "payload": project_picker_tree_payload(self.server.project_picker_base_root, rel_path)})
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if route == "/api/workshop-commands":
            try:
                self._send_json({"ok": True, "payload": workshop_commands_payload(self.server.repo_root)})
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if route == "/api/workshop-sessions":
            self._send_json({"ok": True, "payload": {"sessions": self.server.workshop_sessions.list()}})
            return
        if route == "/api/workshop-terminals":
            self._send_json({"ok": True, "payload": {"sessions": self.server.workshop_terminals.list(), "available": workshop_terminals_available()}})
            return
        if route.startswith("/api/workshop-terminal/"):
            tail = route[len("/api/workshop-terminal/"):]
            parts = tail.split("/", 1)
            session_id = parts[0]
            kind = parts[1] if len(parts) > 1 else "status"
            session = self.server.workshop_terminals.get(session_id)
            if session is None:
                self._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
                return
            if kind == "status":
                self._send_json({"ok": True, "payload": session.status_payload()})
                return
            if kind == "stream":
                self._stream_workshop_terminal(session, parsed)
                return
            self._send_error_json(HTTPStatus.NOT_FOUND, "Unknown terminal sub-resource.")
            return
        if route.startswith("/api/workshop-session/"):
            tail = route[len("/api/workshop-session/"):]
            parts = tail.split("/", 1)
            session_id = parts[0]
            kind = parts[1] if len(parts) > 1 else "status"
            session = self.server.workshop_sessions.get(session_id)
            if session is None:
                self._send_error_json(HTTPStatus.NOT_FOUND, "Workshop session not found.")
                return
            if kind == "status":
                self._send_json({"ok": True, "payload": session.status_payload()})
                return
            if kind == "stream":
                self._stream_workshop_session(session, parsed)
                return
            self._send_error_json(HTTPStatus.NOT_FOUND, "Unknown session sub-resource.")
            return
        if route == "/api/workspace-file":
            rel_path = parse_qs(parsed.query).get("path", [""])[0]
            try:
                payload = workspace_preview_payload(self.server.repo_root, rel_path)
                if payload.get("state") != "image":
                    self._send_error_json(HTTPStatus.BAD_REQUEST, "Workspace file is not an image preview.")
                    return
                _normalized, absolute = _resolve_workspace_path(self.server.repo_root, rel_path)
                self._serve_file(absolute, root=self.server.repo_root)
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            return
        self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if not self._origin_check_passes():
            self._send_cross_origin_forbidden()
            return
        if not self._lan_auth_passes(parsed, method="POST"):
            self._send_lan_unauthorized()
            return
        if self.server.lan_mode and parsed.path in VIEWER_MUTATING_ROUTES:
            allow = False
            if self._client_is_loopback():
                allow = True
            elif self.server.lan_rw_mode and self._paired_device_for_request(parsed) is not None:
                allow = True
            if not allow:
                self._send_error_json(
                    HTTPStatus.FORBIDDEN,
                    "Mutating endpoint refused: pair this device first (see /api/lan/pair/start).",
                )
                return
        if parsed.path == "/api/lan/pair/start":
            self._handle_pair_start()
            return
        if parsed.path == "/api/lan/pair/complete":
            self._handle_pair_complete()
            return
        if parsed.path == "/api/lan/devices/revoke":
            self._handle_device_revoke(parsed)
            return
        if parsed.path == "/api/refresh":
            self._send_json(
                {
                    "ok": True,
                    "payload": self.server.viewer_payload(),
                }
            )
            return
        if parsed.path == "/api/release-reset":
            try:
                self._send_json({"ok": True, "payload": release_reset_payload(self.server.repo_root)})
            except (OSError, ValueError) as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, f"Unable to reset release evidence: {exc}")
            return
        if parsed.path == "/api/git-commit":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                files = body.get("files")
                message = str(body.get("message") or "")
                if not isinstance(files, list) or not all(isinstance(item, str) for item in files):
                    self._send_error_json(HTTPStatus.BAD_REQUEST, "Files must be a list of paths.")
                    return
                payload = git_commit_payload(self.server.repo_root, files, message)
                if payload.get("state") == "ok":
                    self.server.invalidate_status_components({"git"})
                    self._send_json({"ok": True, "payload": payload})
                else:
                    self._send_error_json(HTTPStatus.BAD_REQUEST, str(payload.get("message") or "Git commit failed."))
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/switch-project":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                project_id = str(body.get("projectId") or "")
                self._send_json({"ok": True, "payload": self.server.switch_project(project_id)})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            except FileNotFoundError as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            return
        if parsed.path == "/api/select-project-root":
            try:
                selected = select_project_root_with_native_dialog(self.server.repo_root)
                if selected is None:
                    self._send_error_json(HTTPStatus.BAD_REQUEST, "No folder selected.")
                    return
                self._send_json({"ok": True, "payload": self.server.switch_project_root(selected)})
            except RuntimeError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            except FileNotFoundError as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            return
        if parsed.path == "/api/select-project-root-path":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                rel_path = str(body.get("path") or "")
                normalized = _normalize_workspace_path(rel_path)
                base = self.server.project_picker_base_root.resolve()
                selected = (base / normalized).resolve()
                try:
                    selected.relative_to(base)
                except ValueError as exc:
                    raise ValueError("Selected project path escapes root.") from exc
                self._send_json({"ok": True, "payload": self.server.switch_project_root(selected)})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            except FileNotFoundError as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            return
        if parsed.path == "/api/workshop-command-start":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                command_id = str(body.get("commandId") or "")
                if not command_id:
                    self._send_error_json(HTTPStatus.BAD_REQUEST, "Missing commandId.")
                    return
                catalog = workshop_commands_payload(self.server.repo_root)
                entry = next((c for c in catalog.get("commands", []) if c.get("id") == command_id), None)
                if entry is None:
                    self._send_error_json(HTTPStatus.NOT_FOUND, "Unknown command id.")
                    return
                session = self.server.workshop_sessions.create(entry, self.server.repo_root)
                self._send_json({"ok": True, "payload": session.status_payload()})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if parsed.path == "/api/workshop-terminal-start":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                command_override = body.get("command")
                label = str(body.get("label") or "")
                command = command_override if isinstance(command_override, list) and all(isinstance(p, str) for p in command_override) and command_override else workshop_terminal_default_command()
                session = self.server.workshop_terminals.create(command, self.server.repo_root, label=label)
                self._send_json({"ok": True, "payload": session.status_payload()})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if parsed.path == "/api/workshop-terminal-input":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                session_id = str(body.get("sessionId") or "")
                data = str(body.get("data") or "")
                session = self.server.workshop_terminals.get(session_id)
                if session is None:
                    self._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
                    return
                session.write(data)
                self._send_json({"ok": True})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/workshop-terminal-resize":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                session_id = str(body.get("sessionId") or "")
                rows = int(body.get("rows") or 0)
                cols = int(body.get("cols") or 0)
