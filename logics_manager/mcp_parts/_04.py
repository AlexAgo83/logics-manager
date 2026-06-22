def make_http_handler(repo_root: Path, *, bearer_token: str | None = None) -> type[BaseHTTPRequestHandler]:
    class LogicsMcpHttpHandler(BaseHTTPRequestHandler):
        server_version = "LogicsMCP/1.0"

        def _send_json(self, status: int, payload: dict[str, Any]) -> None:
            encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def _authorized(self) -> bool:
            if not bearer_token:
                return True
            expected = f"Bearer {bearer_token}"
            actual = self.headers.get("Authorization", "")
            if secrets.compare_digest(actual, expected):
                return True
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.send_header("WWW-Authenticate", 'Bearer realm="logics-mcp"')
            encoded = json.dumps({"ok": False, "error": "unauthorized", "message": "Missing or invalid bearer token."}, separators=(",", ":")).encode("utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)
            return False

        def _send_sse_stream(self) -> None:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            self.wfile.write(b": logics-manager-mcp ready\n\n")
            self.wfile.flush()
            while True:
                time.sleep(15)
                self.wfile.write(b": keepalive\n\n")
                self.wfile.flush()

        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            if parsed.path == "/health":
                self._send_json(200, {"ok": True, "server": "logics-manager-mcp", "version": _server_version()})
                return
            if parsed.path == "/mcp":
                if not self._authorized():
                    return
                try:
                    self._send_sse_stream()
                except (BrokenPipeError, ConnectionResetError):
                    return
                return
            self._send_json(404, {"ok": False, "error": "not_found", "message": "Use POST /mcp for JSON-RPC."})

        def do_POST(self) -> None:
            parsed = urlparse(self.path)
            if parsed.path != "/mcp":
                self._send_json(404, {"ok": False, "error": "not_found", "message": "Use POST /mcp for JSON-RPC."})
                return
            if not self._authorized():
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                self._send_json(400, {"ok": False, "error": "bad_request", "message": "Invalid Content-Length."})
                return
            if length <= 0:
                self._send_json(400, {"ok": False, "error": "bad_request", "message": "Content-Length must be positive."})
                return
            if length > MAX_HTTP_BODY_BYTES:
                self._send_json(413, {"ok": False, "error": "payload_too_large", "message": f"Content-Length exceeds {MAX_HTTP_BODY_BYTES} bytes."})
                return
            raw_body = self.rfile.read(length).decode("utf-8")
            try:
                message = json.loads(raw_body)
                if not isinstance(message, dict):
                    raise ValueError("JSON-RPC message must be an object.")
                response = handle_jsonrpc(message, repo_root=repo_root)
            except Exception as exc:
                self._send_json(400, {"jsonrpc": JSONRPC_VERSION, "id": None, "error": {"code": -32700, "message": str(exc)}})
                return
            if response is None:
                self.send_response(202)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            self._send_json(200, response)

        def log_message(self, format: str, *args: Any) -> None:
            print(f"logics-mcp-http: {format % args}", file=sys.stderr)

    return LogicsMcpHttpHandler


def serve_http(*, repo_root: Path | None = None, host: str = "127.0.0.1", port: int = 8765, bearer_token: str | None = None) -> int:
    root = _repo_root(repo_root)
    token = bearer_token or os.environ.get(AUTH_ENV_VAR)
    server = ThreadingHTTPServer((host, port), make_http_handler(root, bearer_token=token))
    print(f"Logics MCP HTTP listening on http://{host}:{server.server_port}/mcp", file=sys.stderr)
    if token:
        print("Logics MCP HTTP requires Authorization: Bearer <token> for POST /mcp", file=sys.stderr)
    else:
        print(f"WARNING: Logics MCP HTTP is running without bearer-token auth. Set {AUTH_ENV_VAR} or pass --bearer-token before tunneling.", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        return 130
    finally:
        server.server_close()
    return 0


def _connector_urls(public_url: str | None) -> dict[str, str]:
    if not public_url:
        return {}
    base = public_url.rstrip("/")
    if base.endswith("/mcp"):
        mcp_url = base
        health_url = base[:-4].rstrip("/") + "/health"
    else:
        mcp_url = f"{base}/mcp"
        health_url = f"{base}/health"
    return {"public_url": base, "mcp_url": mcp_url, "health_url": health_url}


def connector_plan(*, repo_root: Path, host: str, port: int, bearer_token: str | None = None, public_url: str | None = None, no_bearer: bool = False, project_binary: str | None = None) -> dict[str, Any]:
    token = None if no_bearer else bearer_token or secrets.token_urlsafe(32)
    urls = _connector_urls(public_url)
    local_mcp_url = f"http://{host}:{port}/mcp"
    local_health_url = f"http://{host}:{port}/health"
    launcher = project_binary or "python3 -m logics_manager"
    auth_args = "" if no_bearer else f'{AUTH_ENV_VAR}="{token}" '
    server_command = f"{auth_args}{launcher} mcp serve-http --repo-root {repo_root.as_posix()} --host {host} --port {port}"
    auth_header = None if no_bearer else f"Authorization: Bearer {token}"
    cleanup = [
        "Stop the HTTPS tunnel process.",
        "Stop the local mcp serve-http process with Ctrl-C.",
    ]
    if token:
        cleanup.append("Treat the bearer token as expired once the local session is stopped.")
    else:
        cleanup.append("Treat the public tunnel URL as exposed until both processes are stopped.")
    return {
        "ok": True,
        "repo_root": repo_root.as_posix(),
        "bearer_token": token,
        "auth_mode": "none" if no_bearer else "bearer",
        "auth_header": auth_header,
        "local_mcp_url": local_mcp_url,
        "local_health_url": local_health_url,
        "server_command": server_command,
        "tunnel_target": f"{host}:{port}",
        "chatgpt": {
            "developer_mode": True,
            "mcp_url": urls.get("mcp_url", "<your HTTPS tunnel URL>/mcp"),
            "auth_type": "None" if no_bearer else "Bearer token",
            "auth_value": token,
        },
        "smoke_checks": {
            "health": urls.get("health_url", f"<your HTTPS tunnel URL>/health"),
            "mcp_tools_list": urls.get("mcp_url", "<your HTTPS tunnel URL>/mcp"),
        },
        "warnings": ["No-bearer mode is unauthenticated. Use only for short-lived local debugging."] if no_bearer else [],
        "cleanup": cleanup,
        **urls,
    }


def connector_smoke_check(public_url: str, bearer_token: str | None = None, *, timeout: float = 5.0) -> dict[str, Any]:
    urls = _connector_urls(public_url)
    health_ok = False
    mcp_ok = False
    errors: list[str] = []
    try:
        with urlopen(urls["health_url"], timeout=timeout) as response:
            health_ok = response.status == 200
    except (OSError, URLError) as exc:
        errors.append(f"health: {exc}")
    try:
        body = json.dumps({"jsonrpc": JSONRPC_VERSION, "id": 1, "method": "tools/list", "params": {}}).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if bearer_token:
            headers["Authorization"] = f"Bearer {bearer_token}"
        request = Request(urls["mcp_url"], data=body, headers=headers, method="POST")
        with urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
            mcp_ok = response.status == 200 and "result" in payload
    except (OSError, URLError, json.JSONDecodeError) as exc:
        errors.append(f"mcp: {exc}")
    return {"ok": health_ok and mcp_ok, "health_ok": health_ok, "mcp_ok": mcp_ok, "errors": errors, **urls}


def _print_connector_plan(plan: dict[str, Any]) -> None:
    print("Logics MCP Connector")
    for warning in plan.get("warnings", []):
        print(f"WARNING: {warning}")
    print(f"Server command:\n  {plan['server_command']}")
    print(f"Tunnel target: {plan['tunnel_target']}")
    print(f"ChatGPT developer-mode MCP URL: {plan['chatgpt']['mcp_url']}")
    print(f"Auth mode: {plan['auth_mode']}")
    print(f"Authorization header: {plan['auth_header'] or '(none)'}")
    print("Smoke checks:")
    print(f"  health: {plan['smoke_checks']['health']}")
    print(f"  mcp tools/list: {plan['smoke_checks']['mcp_tools_list']}")
    print("Cleanup:")
    for item in plan["cleanup"]:
        print(f"  - {item}")


def _project_binary_path(repo_root: Path) -> str:
    candidate = repo_root / "scripts" / "npm" / "logics-manager.mjs"
    if candidate.is_file():
        return f"node {candidate.as_posix()}"
    return "python3 -m logics_manager"


def _terminate_process(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()


def launch_tunnel(
    *,
    repo_root: Path,
    host: str,
    port: int,
    bearer_token: str | None = None,
    no_bearer: bool = False,
    tunnel_command: list[str] | None = None,
) -> int:
    token = None if no_bearer else bearer_token or secrets.token_urlsafe(32)
    server_command = [sys.executable, "-m", "logics_manager", "mcp", "serve-http", "--repo-root", repo_root.as_posix(), "--host", host, "--port", str(port)]
    env = os.environ.copy()
    if token:
        env[AUTH_ENV_VAR] = token
    tunnel_command = tunnel_command or ["npx", "localtunnel", "--port", str(port)]
    server = subprocess.Popen(server_command, cwd=repo_root, env=env, text=True)
    tunnel: subprocess.Popen[str] | None = None
    previous_sigint = signal.getsignal(signal.SIGINT)
    previous_sigterm = signal.getsignal(signal.SIGTERM)

    def stop(_signum: int | None = None, _frame: Any | None = None) -> None:
        if tunnel is not None:
            _terminate_process(tunnel)
        _terminate_process(server)

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    try:
        time.sleep(0.8)
        if server.poll() is not None:
            return server.returncode or 1
        tunnel = subprocess.Popen(tunnel_command, cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        public_url = None
        start = time.monotonic()
        while time.monotonic() - start < 30:
            if tunnel.poll() is not None:
                return tunnel.returncode or 1
            line = tunnel.stdout.readline() if tunnel.stdout else ""
            if not line:
                time.sleep(0.1)
                continue
            print(line.rstrip())
            match = re.search(r"https://\S+", line)
            if match:
                public_url = match.group(0).rstrip("/")
                break
        if not public_url:
            raise McpToolError("command_failed", "Tunnel command did not print a public HTTPS URL within 30 seconds.", details={"command": tunnel_command})
        plan = connector_plan(repo_root=repo_root, host=host, port=port, bearer_token=token, public_url=public_url, no_bearer=no_bearer, project_binary=_project_binary_path(repo_root))
        _print_connector_plan(plan)
        print("Processes are running. Press Ctrl-C to stop server and tunnel.")
        while True:
            if server.poll() is not None:
                return server.returncode or 1
            if tunnel.poll() is not None:
                return tunnel.returncode or 1
            time.sleep(1)
    except KeyboardInterrupt:
        return 130
    finally:
        stop()
        signal.signal(signal.SIGINT, previous_sigint)
        signal.signal(signal.SIGTERM, previous_sigterm)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="logics-manager mcp", description="Run or inspect the Logics MCP server.")
    sub = parser.add_subparsers(dest="command", required=True)
    serve = sub.add_parser("serve", help="Serve MCP JSON-RPC over stdio.")
    serve.add_argument("--repo-root", default=None)
    serve_http_parser = sub.add_parser("serve-http", help="Serve MCP JSON-RPC over local HTTP for tunnel testing.")
    serve_http_parser.add_argument("--repo-root", default=None)
    serve_http_parser.add_argument("--host", default="127.0.0.1")
    serve_http_parser.add_argument("--port", type=int, default=8765)
    serve_http_parser.add_argument("--bearer-token", default=None, help=f"Require this OAuth-style bearer token for POST /mcp. Defaults to ${AUTH_ENV_VAR} when set.")
    tools = sub.add_parser("tools", help="Print the exposed MCP tool definitions.")
    tools.add_argument("--format", choices=("json",), default="json")
    call = sub.add_parser("call", help="Call one MCP tool directly for local testing.")
    call.add_argument("name")
    call.add_argument("--arguments", default="{}")
    call.add_argument("--repo-root", default=None)
    connect = sub.add_parser("connect", help="Print local HTTP connector setup for ChatGPT developer mode.")
    connect.add_argument("--repo-root", default=None)
    connect.add_argument("--host", default="127.0.0.1")
    connect.add_argument("--port", type=int, default=8765)
    connect.add_argument("--bearer-token", default=None)
    connect.add_argument("--no-bearer", action="store_true", help="Print a no-auth connector plan for short-lived local debugging.")
    connect.add_argument("--public-url", default=None, help="Optional HTTPS tunnel URL used for copyable ChatGPT setup and smoke checks.")
    connect.add_argument("--check", action="store_true", help="Run /health and authenticated /mcp smoke checks against --public-url.")
    connect.add_argument("--format", choices=("text", "json"), default="text")
    tunnel = sub.add_parser("tunnel", help="Start the local MCP HTTP server plus an HTTPS localtunnel session.")
    tunnel.add_argument("--repo-root", default=None)
    tunnel.add_argument("--host", default="127.0.0.1")
    tunnel.add_argument("--port", type=int, default=8765)
    tunnel.add_argument("--bearer-token", default=None)
    tunnel.add_argument("--no-bearer", action="store_true", help="Run without bearer auth for short-lived local debugging.")
    parsed = parser.parse_args(argv)

    if parsed.command == "tools":
        print(json.dumps({"tools": TOOL_DEFINITIONS}, indent=2, sort_keys=True))
        return 0
    if parsed.command == "serve":
        return serve_stdio(repo_root=Path(parsed.repo_root) if parsed.repo_root else None)
    if parsed.command == "serve-http":
        return serve_http(repo_root=Path(parsed.repo_root) if parsed.repo_root else None, host=parsed.host, port=parsed.port, bearer_token=parsed.bearer_token)
    if parsed.command == "call":
        try:
            arguments = json.loads(parsed.arguments)
        except json.JSONDecodeError as exc:
            raise SystemExit(f"Invalid JSON arguments: {exc}") from exc
        if not isinstance(arguments, dict):
            raise SystemExit("Arguments must be a JSON object.")
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                payload = call_tool(parsed.name, arguments, repo_root=Path(parsed.repo_root) if parsed.repo_root else None)
        except McpToolError as exc:
            print(json.dumps(exc.to_payload(), indent=2, sort_keys=True))
            return 1
        print(json.dumps(payload, indent=2, sort_keys=True))
        return 0
    if parsed.command == "connect":
        root = _repo_root(Path(parsed.repo_root) if parsed.repo_root else None)
        if parsed.no_bearer and parsed.bearer_token:
            raise SystemExit("--no-bearer cannot be combined with --bearer-token.")
        plan = connector_plan(repo_root=root, host=parsed.host, port=parsed.port, bearer_token=parsed.bearer_token, public_url=parsed.public_url, no_bearer=parsed.no_bearer, project_binary=_project_binary_path(root))
        if parsed.check:
            if not parsed.public_url:
                raise SystemExit("--check requires --public-url.")
            plan["check"] = connector_smoke_check(parsed.public_url, str(plan["bearer_token"]) if plan["bearer_token"] else None)
            plan["ok"] = bool(plan["check"]["ok"])
        if parsed.format == "json":
            print(json.dumps(plan, indent=2, sort_keys=True))
        else:
            _print_connector_plan(plan)
            if "check" in plan:
                print(f"Check: {'OK' if plan['check']['ok'] else 'FAILED'}")
                for error in plan["check"]["errors"]:
                    print(f"  - {error}")
        return 0 if plan["ok"] else 1
    if parsed.command == "tunnel":
        if parsed.no_bearer and parsed.bearer_token:
            raise SystemExit("--no-bearer cannot be combined with --bearer-token.")
        root = _repo_root(Path(parsed.repo_root) if parsed.repo_root else None)
        return launch_tunnel(repo_root=root, host=parsed.host, port=parsed.port, bearer_token=parsed.bearer_token, no_bearer=parsed.no_bearer)
    return 1
