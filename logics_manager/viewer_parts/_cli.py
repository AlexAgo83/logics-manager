def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="logics-manager view", description="Start the local read-only Logics browser viewer.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host. Defaults to 127.0.0.1.")
    parser.add_argument("--port", type=int, default=8765, help="Bind port. Use 0 to select an available port.")
    parser.add_argument(
        "--lan",
        action="store_true",
        help="Expose the viewer on the local network (0.0.0.0). Enforces read-only access and requires a per-session bearer token for non-loopback requests.",
    )
    parser.add_argument(
        "--lan-rw",
        action="store_true",
        help="Allow paired devices to mutate state over LAN. Devices must complete a PIN handshake first (PIN is printed on the host's stdout). Implies --lan.",
    )
    parser.add_argument(
        "--tls",
        action="store_true",
        help="Serve over HTTPS using a self-signed cert. Auto-generated under ~/.cache/logics-manager/tls/ on first use; needs `openssl` in PATH unless a cert pair is provided via --tls-cert / --tls-key.",
    )
    parser.add_argument(
        "--tls-cert",
        default=None,
        help="Path to a PEM-encoded TLS certificate. Implies --tls when set together with --tls-key.",
    )
    parser.add_argument(
        "--tls-key",
        default=None,
        help="Path to a PEM-encoded TLS private key. Implies --tls when set together with --tls-cert.",
    )
    parser.add_argument(
        "--refresh-interval",
        type=int,
        default=None,
        help="Automatic refresh interval in seconds. Defaults to 15; positive intervals are allowed.",
    )
    parser.add_argument("--focus", help="Open the viewer focused on a workflow ref or repo-relative Logics Markdown path.")
    parser.add_argument("--read", action="store_true", help="Open the focused item in the read preview. Requires --focus.")
    parser.add_argument("--open", action="store_true", help="Open the viewer in the default browser.")
    parser.add_argument("--no-open", action="store_true", help="Do not open the browser. This is the default.")
    parser.add_argument(
        "-y",
        "--yes",
        action="store_true",
        help="Skip the confirmation prompt when launching in a location without a Logics corpus.",
    )
    return parser


def _confirm_launch_without_corpus(repo_root: Path, *, assume_yes: bool) -> bool:
    """Confirm before launching the viewer where no `logics/` corpus exists.

    Guards against launching in the wrong directory. When the prompt cannot be
    answered interactively (no TTY, e.g. spawned by a wrapper), the launch
    proceeds in bootstrap onboarding mode — preserving the prior behavior.
    """
    message = (
        f"No Logics corpus ('logics/' directory) found at {repo_root}.\n"
        "The viewer will start in bootstrap onboarding mode for this location."
    )
    print(message)
    if assume_yes or not sys.stdin.isatty():
        return True
    try:
        answer = input("Start the viewer here anyway? [y/N] ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        print()
        return False
    return answer in {"y", "yes"}


def _resolve_viewer_root(start: Path) -> Path:
    """Locate the repo root, falling back to a bootstrap root when none exists.

    Normally the viewer requires a `logics/` corpus (find_repo_root). To let the
    viewer launch in a not-yet-bootstrapped repo and offer the in-app bootstrap
    onboarding (canBootstrapLogics), fall back to the git toplevel (if any), then
    the current directory, when no `logics/` directory is found upward.
    """
    try:
        return find_repo_root(start)
    except ConfigError:
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--show-toplevel"],
                cwd=start,
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0 and result.stdout.strip():
                return Path(result.stdout.strip()).resolve()
        except (OSError, subprocess.SubprocessError):
            pass
        return start.resolve()


def main(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    repo_root = _resolve_viewer_root(Path.cwd())
    if not (repo_root / "logics").is_dir():
        if not _confirm_launch_without_corpus(repo_root, assume_yes=args.yes):
            print("Aborted.")
            return 0
    refresh_interval_forced = args.refresh_interval is not None
    refresh_interval = args.refresh_interval if args.refresh_interval is not None else 15
    if refresh_interval <= 0:
        raise SystemExit("--refresh-interval must be a positive number of seconds.")
    if args.read and not args.focus:
        raise SystemExit("--read requires --focus.")
    try:
        focus = normalize_viewer_focus_target(repo_root, args.focus) if args.focus else None
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    lan_enabled = bool(args.lan) or bool(args.lan_rw)
    bind_host = "0.0.0.0" if lan_enabled and args.host == "127.0.0.1" else args.host
    if args.lan_rw and not args.tls and not (args.tls_cert and args.tls_key):
        sys.stdout.write(
            "[warn] --lan-rw without --tls exposes device tokens over plain HTTP. "
            "Add --tls (or wrap the viewer in a Tailscale / VPN) before pairing real devices.\n"
        )
    tls_requested = bool(args.tls) or bool(args.tls_cert) or bool(args.tls_key)
    tls_context: ssl.SSLContext | None = None
    if tls_requested:
        if bool(args.tls_cert) ^ bool(args.tls_key):
            raise SystemExit("--tls-cert and --tls-key must be provided together.")
        if args.tls_cert and args.tls_key:
            cert_path = Path(args.tls_cert).expanduser().resolve()
            key_path = Path(args.tls_key).expanduser().resolve()
            if not cert_path.is_file() or not key_path.is_file():
                raise SystemExit("--tls-cert / --tls-key paths must point to existing files.")
        else:
            san_candidates: list[str] = []
            lan_ip = _detect_lan_ip()
            if lan_ip:
                san_candidates.append(lan_ip)
            cert_path, key_path = _ensure_tls_material(san_candidates)
        tls_context = _build_tls_context(cert_path, key_path)
    server = create_viewer_server(
        repo_root,
        host=bind_host,
        port=args.port,
        auto_refresh_interval_seconds=refresh_interval,
        auto_refresh_interval_forced=refresh_interval_forced,
        lan_mode=lan_enabled,
        lan_rw_mode=bool(args.lan_rw),
        tls_context=tls_context,
    )
    host, port = server.server_address[:2]
    scheme = server.url_scheme
    url = build_viewer_url(str(host), int(port), focus=focus, read=bool(args.read), scheme=scheme)
    network_url = _network_viewer_url(str(host), int(port), focus=focus, read=bool(args.read), scheme=scheme)
    lan_share_url = ""
    qr_lines: list[str] = []
    if lan_enabled and server.lan_token:
        base_for_lan = network_url or url
        lan_share_url = _append_lan_token(base_for_lan, server.lan_token)
        qr_lines = _render_qr_lines(lan_share_url)
    print(
        render_start_status(
            url,
            repo_root,
            focus=focus,
            network_url=network_url,
            bind_host=str(host),
            auto_refresh_interval_seconds=refresh_interval,
            lan_mode=lan_enabled,
            lan_rw_mode=server.lan_rw_mode,
            lan_token=server.lan_token if lan_enabled else None,
            lan_url=lan_share_url or None,
            qr_lines=qr_lines or None,
            tls_enabled=server.tls_enabled,
            version=_current_version(),
        ),
        flush=True,
    )
    if args.open and not args.no_open:
        webbrowser.open(url)

    # Install explicit shutdown handlers so the server stops cleanly on
    # SIGINT (Ctrl+C) and SIGTERM (kill). Relying solely on serve_forever()
    # raising KeyboardInterrupt is fragile: when the process is launched in
    # the background or via a wrapper (node/cdx launcher, nohup, &), it
    # inherits SIGINT as SIG_IGN, so Python never installs its default
    # handler, KeyboardInterrupt is never raised, and Ctrl+C appears to
    # freeze. Setting the handler here overrides any inherited SIG_IGN and
    # turns SIGTERM into a graceful shutdown (closing workshop terminals)
    # instead of an abrupt kill. shutdown() must run off the serve_forever
    # thread, so dispatch it to a short-lived thread.
    #
    # Belt-and-suspenders: a long-lived SSE handler thread (an open browser on
    # /api/events) or a wedged child can keep the graceful path from completing.
    # After requesting shutdown we arm a watchdog that force-exits the process
    # if the clean path has not returned within a short grace window, so Ctrl+C
    # is guaranteed to kill the server. A second signal exits immediately.
    import signal as _signal

    _SHUTDOWN_GRACE_SECONDS = 3.0
    _shutdown_state: dict[str, Any] = {"requested": False}

    def _exit_code_for_signal(signum: int) -> int:
        return 143 if signum == _signal.SIGTERM else 130

    def _force_exit_after_grace(signum: int) -> None:
        time.sleep(_SHUTDOWN_GRACE_SECONDS)
        # Reaching here means the clean path is still stuck: the process would
        # already be gone otherwise. Force the exit so Ctrl+C never hangs.
        os._exit(_exit_code_for_signal(signum))

    def _request_shutdown(_signum: int, _frame: Any) -> None:
        if _shutdown_state["requested"]:
            # Impatient second Ctrl+C: don't wait for the grace window.
            os._exit(_exit_code_for_signal(_signum))
        _shutdown_state["requested"] = True
        threading.Thread(target=server.shutdown, daemon=True).start()
        threading.Thread(
            target=_force_exit_after_grace, args=(_signum,), daemon=True
        ).start()

    for _sig in (_signal.SIGINT, _signal.SIGTERM):
        try:
            _signal.signal(_sig, _request_shutdown)
        except (ValueError, OSError):
            # Not in the main thread or signal unavailable on this platform;
            # fall back to the KeyboardInterrupt path below.
            pass

    interrupted = False
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        interrupted = True
    finally:
        try:
            server.server_close()
        except KeyboardInterrupt:
            interrupted = True
    if getattr(server, "restart_requested", False):
        command = [sys.executable, *sys.argv]
        os.execv(command[0], command)
    if interrupted:
        return 0
    return 0
    return 0
