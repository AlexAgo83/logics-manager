class LogicsViewerRequestHandler(BaseHTTPRequestHandler):
    server: LogicsViewerServer

    def log_message(self, format: str, *args: object) -> None:
        return

    def _send_bytes(
        self,
        content: bytes,
        *,
        status: int = 200,
        content_type: str = "application/octet-stream",
        etag: str = "",
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        if etag:
            # no-cache (not no-store) keeps the response in the browser cache
            # but forces revalidation, so fetch() transparently sends
            # If-None-Match and we can answer 304 when nothing changed.
            self.send_header("Cache-Control", "no-cache")
            self.send_header("ETag", etag)
        else:
            self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        try:
            self.wfile.write(content)
        except (BrokenPipeError, ConnectionResetError):
            return

    def _send_json(self, payload: Any, *, status: int = 200) -> None:
        self._send_bytes(_json_bytes(payload), status=status, content_type="application/json; charset=utf-8")

    def _status_component(self, name: str) -> Any:
        repo_root = self.server.repo_root
        producers = {
            "git": lambda: git_status_payload(repo_root),
            "ci": lambda: ci_status_payload(repo_root),
            "release": lambda: release_status_payload(repo_root),
            "releaseRuns": lambda: release_runs_payload(repo_root),
            "cdx": lambda: cdx_status_payload(repo_root),
            "cdxRuns": lambda: cdx_runs_payload(repo_root),
            "cdxHistory": lambda: cdx_history_payload(repo_root),
        }
        return self.server.status_component(name, producers[name])

    def _send_status_json(self, cache_key: str, producer: Any) -> None:
        """Serve a status payload with a short TTL cache and ETag revalidation.

        `producer` is a zero-arg callable returning the inner payload dict; it
        is only invoked on a cache miss. Identical back-to-back polls (and the
        several badge fetches each auto-refresh fires) reuse the cached body.
        """
        server = self.server
        full_key = f"{cache_key}::{server.repo_root}"
        now = time.monotonic()
        cached: tuple[float, str, bytes] | None = None
        with server.status_cache_lock:
            entry = server.status_cache.get(full_key)
            if entry is not None and (now - entry[0]) < STATUS_CACHE_TTL_SECONDS:
                cached = entry
        if cached is None:
            body = _json_bytes({"ok": True, "payload": producer()})
            etag = '"%s"' % hashlib.sha1(body).hexdigest()
            with server.status_cache_lock:
                server.status_cache[full_key] = (now, etag, body)
        else:
            _, etag, body = cached
        if etag and self.headers.get("If-None-Match", "") == etag:
            self.send_response(HTTPStatus.NOT_MODIFIED.value)
            self.send_header("ETag", etag)
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            return
        self._send_bytes(body, content_type="application/json; charset=utf-8", etag=etag)

    def _send_error_json(self, status: HTTPStatus, message: str) -> None:
        self._send_json({"ok": False, "error": message}, status=status.value)

    def _read_json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        try:
            payload = json.loads(raw or "{}")
        except json.JSONDecodeError:
            return {}
        return payload if isinstance(payload, dict) else {}

    def _handle_pair_start(self) -> None:
        broker = self.server.pairing_broker
        if broker is None:
            self._send_error_json(HTTPStatus.FORBIDDEN, "Device pairing is disabled. Start the viewer with --lan-rw.")
            return
        body = self._read_json_body()
        label = str(body.get("label") or "").strip()[:64]
        requester_ip = self.client_address[0] if self.client_address else ""
        entry = broker.start(label=label or "device", requester_ip=requester_ip)
        # Emit the PIN on the host's stdout so the operator can read it
        # without having to keep the viewer UI in foreground.
        sys.stdout.write(
            f"[lan-pair] '{entry.label}' wants write access from {requester_ip or 'unknown'}.\n"
            f"[lan-pair] PIN: {entry.pin}  (valid {_PAIRING_PIN_TTL_SECONDS}s)\n"
        )
        sys.stdout.flush()
        self._send_json({
            "ok": True,
            "payload": {
                "pairingId": entry.pairing_id,
                "ttlSeconds": _PAIRING_PIN_TTL_SECONDS,
                "label": entry.label,
            },
        })

    def _handle_pair_complete(self) -> None:
        broker = self.server.pairing_broker
        registry = self.server.device_registry
        if broker is None or registry is None:
            self._send_error_json(HTTPStatus.FORBIDDEN, "Device pairing is disabled. Start the viewer with --lan-rw.")
            return
        body = self._read_json_body()
        pairing_id = str(body.get("pairingId") or "")
        pin = str(body.get("pin") or "")
        label_override = str(body.get("label") or "").strip()[:64]
        outcome = broker.try_complete(pairing_id=pairing_id, pin=pin)
        if outcome is None:
            self._send_error_json(HTTPStatus.UNAUTHORIZED, "Pairing expired, unknown, or too many attempts.")
            return
        status, entry = outcome
        if status != "ok":
            self._send_error_json(HTTPStatus.UNAUTHORIZED, "Wrong PIN.")
            return
        token = secrets.token_urlsafe(32)
        device = registry.register(label_override or entry.label, token)
        sys.stdout.write(f"[lan-pair] Approved '{device.label}' (id={device.id}).\n")
        sys.stdout.flush()
        self._send_json({
            "ok": True,
            "payload": {
                "deviceId": device.id,
                "deviceToken": token,
                "label": device.label,
            },
        })

    def _handle_device_revoke(self, parsed: Any) -> None:
        registry = self.server.device_registry
        if registry is None:
            self._send_error_json(HTTPStatus.FORBIDDEN, "Device pairing is disabled.")
            return
        body = self._read_json_body()
        device_id = str(body.get("deviceId") or "")
        if not device_id:
            self._send_error_json(HTTPStatus.BAD_REQUEST, "deviceId is required.")
            return
        paired_device = self._paired_device_for_request(parsed)
        if not self._client_is_loopback() and (paired_device is None or paired_device.id != device_id):
            self._send_error_json(HTTPStatus.FORBIDDEN, "Device can only revoke its own pairing.")
            return
        removed = registry.revoke(device_id)
        if not removed:
            self._send_error_json(HTTPStatus.NOT_FOUND, "Device not found.")
            return
        sys.stdout.write(f"[lan-pair] Revoked device id={device_id}.\n")
        sys.stdout.flush()
        self._send_json({"ok": True, "payload": {"deviceId": device_id}})

    def _serve_file(self, path: Path, *, root: Path) -> None:
        root_name = os.path.realpath(root)
        absolute_name = os.path.realpath(path)
        try:
            common = os.path.commonpath([root_name, absolute_name])
        except ValueError:
            self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
            return
        if common != root_name:
            self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
            return
        absolute = Path(absolute_name)
        if not absolute.is_file():  # lgtm [py/path-injection]
            self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
            return
        content_type = STATIC_CONTENT_TYPES.get(absolute.suffix.lower(), "application/octet-stream")
        self._send_bytes(absolute.read_bytes(), content_type=content_type)  # lgtm [py/path-injection]

    def _stream_workshop_terminal(self, session: "WorkshopTerminalSession", parsed: Any) -> None:
        import time as _time
        try:
            since = int(parse_qs(parsed.query).get("since", ["0"])[0])
        except (TypeError, ValueError):
            since = 0
        try:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
        except (BrokenPipeError, ConnectionResetError):
            return
        try:
            last_seq = since
            idle_ticks = 0
            while True:
                latest_seq, snapshot = session.tail(last_seq)
                if snapshot:
                    idle_ticks = 0
                    for seq, chunk in snapshot:
                        last_seq = seq
                        try:
                            payload = json.dumps({"seq": seq, "data": chunk})
                            self.wfile.write(f"event: data\ndata: {payload}\n\n".encode("utf-8"))
                            self.wfile.flush()
                        except (BrokenPipeError, ConnectionResetError):
                            return
                state = session.state
                if state in {"finished", "failed", "stopped", "error"} and last_seq >= latest_seq:
                    try:
                        payload = json.dumps(session.status_payload())
                        self.wfile.write(f"event: end\ndata: {payload}\n\n".encode("utf-8"))
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        return
                    return
                idle_ticks += 1
                if idle_ticks >= 30:
                    try:
                        self.wfile.write(b": keep-alive\n\n")
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        return
                    idle_ticks = 0
                _time.sleep(0.1)
        except (BrokenPipeError, ConnectionResetError):
            return

    def _stream_workshop_session(self, session: "WorkshopCommandSession", parsed: Any) -> None:
        import time as _time
        try:
            since = int(parse_qs(parsed.query).get("since", ["0"])[0])
        except (TypeError, ValueError):
            since = 0
        try:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
        except (BrokenPipeError, ConnectionResetError):
            return
        last_seq = since
        idle_ticks = 0
        try:
            while True:
                latest_seq, snapshot = session.tail(last_seq)
                if snapshot:
                    idle_ticks = 0
                    for seq, line in snapshot:
                        last_seq = seq
                        try:
                            channel, _, text = line.partition("\t")
                            payload = json.dumps({"seq": seq, "channel": channel, "line": text})
                            self.wfile.write(f"event: line\ndata: {payload}\n\n".encode("utf-8"))
                            self.wfile.flush()
                        except (BrokenPipeError, ConnectionResetError):
                            return
                state = session.state
                if state in {"finished", "failed", "stopped", "error"} and last_seq >= latest_seq:
                    try:
                        payload = json.dumps(session.status_payload())
                        self.wfile.write(f"event: end\ndata: {payload}\n\n".encode("utf-8"))
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        return
                    return
                idle_ticks += 1
                if idle_ticks >= 30:
                    try:
                        self.wfile.write(b": keep-alive\n\n")
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        return
                    idle_ticks = 0
                _time.sleep(0.2)
        except (BrokenPipeError, ConnectionResetError):
            return

    def _viewer_event_snapshot(self, *, include_remote: bool = False) -> dict[str, Any]:
        repo_root = self.server.repo_root
        snapshot: dict[str, Any] = {
            "corpus": _tree_latest_mtime_ns(repo_root / "logics"),
            "git": _git_event_signature(repo_root),
        }
        if include_remote:
            snapshot["ci"] = _stable_json_signature(self._status_component("ci"))
            snapshot["releaseRuns"] = _stable_json_signature(self._status_component("releaseRuns"))
            snapshot["cdx"] = _stable_json_signature({
                "status": self._status_component("cdx"),
                "runs": self._status_component("cdxRuns"),
            })
        return snapshot

    def _stream_viewer_events(self) -> None:
        try:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
        except (BrokenPipeError, ConnectionResetError):
            return
        try:
            baseline = self._viewer_event_snapshot(include_remote=True)
            payload = json.dumps({"seq": self.server.next_event_seq(), "components": []})
            self.wfile.write(f"event: ready\ndata: {payload}\n\n".encode("utf-8"))
            self.wfile.flush()
            remote_due_at = time.monotonic() + VIEWER_EVENT_REMOTE_POLL_SECONDS
            idle_ticks = 0
            while True:
                now = time.monotonic()
                include_remote = now >= remote_due_at
                current = self._viewer_event_snapshot(include_remote=include_remote)
                if include_remote:
                    remote_due_at = now + VIEWER_EVENT_REMOTE_POLL_SECONDS
                else:
                    for name in ("ci", "releaseRuns", "cdx"):
                        if name in baseline:
                            current[name] = baseline[name]
                changed = sorted(name for name, value in current.items() if baseline.get(name) != value)
                if changed:
                    baseline = current
                    self.server.invalidate_status_components(set(changed))
                    payload = json.dumps({"seq": self.server.next_event_seq(), "components": changed})
                    self.wfile.write(f"event: changed\ndata: {payload}\n\n".encode("utf-8"))
                    self.wfile.flush()
                    idle_ticks = 0
                else:
                    idle_ticks += 1
                    if idle_ticks >= 30:
                        self.wfile.write(b": keep-alive\n\n")
                        self.wfile.flush()
                        idle_ticks = 0
                time.sleep(VIEWER_EVENT_POLL_SECONDS)
        except (BrokenPipeError, ConnectionResetError):
            return

    def _client_is_loopback(self) -> bool:
        try:
            host = self.client_address[0]
        except (IndexError, AttributeError):
            return False
        if not host:
            return False
        if host in {"127.0.0.1", "::1"}:
            return True
        if host.startswith("127."):
            return True
        if host.startswith("::ffff:127."):
            return True
        return False

    def _is_public_get_route(self, route: str) -> bool:
        """Static UI assets that must load before the JS can attach the bearer.

        Browsers do not auto-attach Authorization headers to <script src>,
        <link href>, or @font-face fetches, and we cannot put ?t= on every
        asset URL the page references. We let these routes through
        unauthenticated; they expose no repository data — every actual
        payload lives under /api/* which stays gated.
        """
        if route in {"/", "/browser-host.js", "/viewer.css", "/vendor/mermaid.min.js"}:
            return True
        if route.startswith("/media/"):
            return True
        return False

    def _allowed_origins(self) -> set[str]:
        """Origins the viewer is willing to accept mutating requests from.

        Built from the actual bound host/port plus the detected LAN IP and
        the canonical loopback names so the same set covers every URL the
        launch banner can hand out.
        """
        scheme = self.server.url_scheme
        port = int(self.server.server_address[1])
        hosts = {"127.0.0.1", "localhost", "::1", "[::1]"}
        bind_host = str(self.server.server_address[0])
        if bind_host and bind_host not in {"0.0.0.0", "::", ""}:
            hosts.add(bind_host)
        lan_ip = _detect_lan_ip()
        if lan_ip:
            hosts.add(lan_ip)
        return {f"{scheme}://{host}:{port}" for host in hosts}

    def _origin_check_passes(self) -> bool:
        """Reject cross-origin mutations.

        Loopback clients are trusted (the desktop UI itself, scripts, dev
        tools). For every other client we require Origin (or Referer
        fallback for redirects) to match one of the URLs the server hands
        out. This blocks CSRF: a malicious page on the user's phone cannot
        POST to the viewer's mutating endpoints because its Origin will
        not match.
        """
        if self._client_is_loopback():
            return True
        allowed = self._allowed_origins()
        origin = self.headers.get("Origin", "").strip()
        if origin:
            return origin in allowed
        referer = self.headers.get("Referer", "").strip()
        if referer:
            parsed_referer = urlparse(referer)
            referer_origin = f"{parsed_referer.scheme}://{parsed_referer.netloc}"
            return referer_origin in allowed
        # No Origin and no Referer from a non-loopback client: refuse. A
        # legitimate browser always sends one or the other on a POST.
        return False

    def _send_cross_origin_forbidden(self) -> None:
        body = _json_bytes({"ok": False, "error": "Cross-origin mutation refused."})
        try:
            self.send_response(HTTPStatus.FORBIDDEN)
            self.send_header("Content-Type", "application/json; charset=utf-8")
