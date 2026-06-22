                session = self.server.workshop_terminals.get(session_id)
                if session is None:
                    self._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
                    return
                session.resize(rows, cols)
                self._send_json({"ok": True})
            except (json.JSONDecodeError, ValueError):
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid resize body.")
            return
        if parsed.path == "/api/workshop-terminal-rename":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                session_id = str(body.get("sessionId") or "")
                label = str(body.get("label") or "")
                session = self.server.workshop_terminals.get(session_id)
                if session is None:
                    self._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
                    return
                session.rename(label)
                self._send_json({"ok": True, "payload": session.status_payload()})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except ValueError as exc:
                self._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
            return
        if parsed.path == "/api/workshop-terminal-stop":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                session_id = str(body.get("sessionId") or "")
                session = self.server.workshop_terminals.get(session_id)
                if session is None:
                    self._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
                    return
                session.stop()
                self._send_json({"ok": True, "payload": session.status_payload()})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/workshop-command-stop":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                session_id = str(body.get("sessionId") or "")
                session = self.server.workshop_sessions.get(session_id)
                if session is None:
                    self._send_error_json(HTTPStatus.NOT_FOUND, "Workshop session not found.")
                    return
                session.stop()
                self._send_json({"ok": True, "payload": session.status_payload()})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/bootstrap-logics":
            try:
                bootstrap = bootstrap_payload(self.server.repo_root, check=False)
                self._send_json({"ok": True, "payload": self.server.viewer_payload(), "bootstrap": bootstrap})
            except SystemExit as exc:
                self._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if parsed.path == "/api/new-request":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                if not isinstance(body, dict):
                    raise ValueError("Request body must be a JSON object.")
                draft = body.get("draft") if isinstance(body.get("draft"), dict) else body
                created = create_request_from_viewer_draft(self.server.repo_root, draft)
                self._send_json({"ok": True, "created": created, "payload": self.server.viewer_payload(selected_id=created["id"])})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except ValueError as exc:
                self._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if parsed.path == "/api/restart-viewer":
            self.server.request_restart()
            self._send_json({"ok": True, "message": "Viewer server restarting."})
            return
        if parsed.path == "/api/cdx-report-request":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                report_payload = cdx_run_report_payload(self.server.repo_root, str(body.get("runId") or ""))
                if report_payload.get("state") != "ok":
                    self._send_error_json(HTTPStatus.BAD_GATEWAY, str(report_payload.get("message") or "Unable to load CDX report."))
                    return
                created = create_request_from_cdx_report(self.server.repo_root, report_payload)
                self._send_json({"ok": True, "created": created, "payload": self.server.viewer_payload(selected_id=created["id"])})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if parsed.path == "/api/cdx-mission-plan":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                self._send_json({"ok": True, "payload": cdx_mission_plan_payload(self.server.repo_root, body)})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/cdx-mission-run":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                self._send_json({"ok": True, "payload": cdx_mission_run_payload(self.server.repo_root, body)})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/cdx-mission-apply-plan":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                self._send_json({"ok": True, "payload": cdx_mission_apply_plan_payload(self.server.repo_root, body)})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/cdx-import":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
                return
            file_b64 = str(body.get("fileBase64") or "")
            passphrase = str(body.get("passphrase") or "")
            merge = bool(body.get("merge", True))
            force = bool(body.get("force", False))
            if not file_b64:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "fileBase64 is required.")
                return
            import base64
            try:
                file_bytes = base64.b64decode(file_b64)
            except Exception:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid base64 in fileBase64.")
                return
            result = cdx_import_payload(self.server.repo_root, file_bytes, passphrase, merge, force)
            if result.get("ok"):
                self._send_json({"ok": True, "payload": result})
            else:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, result.get("error", "Import failed."))
            return
        if parsed.path == "/api/cdx-export":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
                return
            sessions = [str(s) for s in (body.get("sessions") or []) if s]
            passphrase = str(body.get("passphrase") or "")
            include_auth = bool(body.get("includeAuth", True))
            result = cdx_export_payload(self.server.repo_root, sessions, passphrase, include_auth)
            if result.get("ok"):
                self._send_json({"ok": True, "payload": result})
            else:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, result.get("error", "Export failed."))
            return
        if parsed.path == "/api/cdx-toggle":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
                return
            session = str(body.get("session") or "")
            enable = bool(body.get("enable", True))
            result = cdx_toggle_payload(self.server.repo_root, session, enable)
            if result.get("ok"):
                self._send_json({"ok": True, "payload": result})
            else:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, result.get("error", "Toggle failed."))
            return
        if parsed.path == "/api/cdx-permission":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
                return
            session = str(body.get("session") or "")
            permission = str(body.get("permission") or "")
            result = cdx_permission_payload(self.server.repo_root, session, permission)
            if result.get("ok"):
                self._send_json({"ok": True, "payload": result})
            else:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, result.get("error", "Permission update failed."))
            return
        if parsed.path == "/api/cdx-config":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
                return
            session = str(body.get("session") or "")
            power = str(body.get("power")) if body.get("power") is not None else None
            model = str(body.get("model")) if body.get("model") is not None else None
            fast = bool(body.get("fast")) if body.get("fast") is not None else None
            result = cdx_config_payload(self.server.repo_root, session, power=power, model=model, fast=fast)
            if result.get("ok"):
                self._send_json({"ok": True, "payload": result})
            else:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, result.get("error", "Config update failed."))
            return
        if parsed.path == "/api/cdx-remove":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
                return
            session = str(body.get("session") or "")
            result = cdx_remove_payload(self.server.repo_root, session)
            if result.get("ok"):
                self._send_json({"ok": True, "payload": result})
            else:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, result.get("error", "Remove failed."))
            return
        if parsed.path == "/api/update-status":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                rel_path = normalize_viewer_focus_target(self.server.repo_root, str(body.get("path") or body.get("ref") or ""))
                status = " ".join(str(body.get("status") or "").split())
                stage = _infer_stage(rel_path, Path(rel_path).stem)
                allowed = VIEWER_STATUS_OPTIONS_BY_STAGE.get(stage, ())
                if not status:
                    self._send_error_json(HTTPStatus.BAD_REQUEST, "Missing status.")
                    return
                matched_status = next((entry for entry in allowed if entry.lower() == status.lower()), "")
                if not matched_status:
                    self._send_error_json(HTTPStatus.BAD_REQUEST, f"Unsupported status for {stage}: {status}.")
                    return
                payload = update_workflow_indicators_payload(self.server.repo_root, rel_path, {"Status": matched_status})
                self._send_json({"ok": True, "payload": payload, "viewer": self.server.viewer_payload(selected_id=str(payload.get("ref") or ""))})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            except SystemExit as exc:
                self._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if parsed.path == "/api/edit":
            rel_path = parse_qs(parsed.query).get("path", [""])[0]
            try:
                self._send_json({"ok": True, "document": edit_doc_payload(self.server.repo_root, rel_path)})
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if parsed.path == "/api/open-file":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                self._send_json({"ok": True, "payload": open_file_payload(self.server.repo_root, str(body.get("path", "")))})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if parsed.path == "/api/file-preview":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                self._send_json({"ok": True, "payload": file_preview_payload(self.server.repo_root, str(body.get("path", "")))})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if parsed.path == "/api/cdx-artifact-preview":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                self._send_json({"ok": True, "payload": cdx_artifact_preview_payload(self.server.repo_root, str(body.get("path", "")))})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if parsed.path == "/api/open-repo-folder":
            try:
                self._send_json({"ok": True, "payload": open_repo_folder_payload(self.server.repo_root)})
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
