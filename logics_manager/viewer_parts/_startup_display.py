def create_viewer_server(
    repo_root: Path,
    host: str = "127.0.0.1",
    port: int = 8765,
    *,
    auto_refresh_interval_seconds: int = 15,
    auto_refresh_interval_forced: bool = False,
    lan_mode: bool = False,
    lan_rw_mode: bool = False,
    tls_context: ssl.SSLContext | None = None,
) -> LogicsViewerServer:
    return LogicsViewerServer(
        (host, port),
        repo_root,
        auto_refresh_interval_seconds=auto_refresh_interval_seconds,
        auto_refresh_interval_forced=auto_refresh_interval_forced,
        lan_mode=lan_mode,
        lan_rw_mode=lan_rw_mode,
        tls_context=tls_context,
    )


def select_project_root_with_native_dialog(initial_dir: Path) -> Path | None:
    try:
        import tkinter as tk
        from tkinter import filedialog
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("Native folder picker is not available in this environment.") from exc
    root = None
    try:
        root = tk.Tk()
        root.withdraw()
        try:
            root.attributes("-topmost", True)
        except Exception:
            pass
        selected = filedialog.askdirectory(
            parent=root,
            initialdir=str(initial_dir if initial_dir.is_dir() else Path.cwd()),
            title="Select Logics project folder",
            mustexist=True,
        )
        return Path(selected).expanduser().resolve() if selected else None
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("Unable to open the native folder picker.") from exc
    finally:
        if root is not None:
            try:
                root.destroy()
            except Exception:
                pass


def _render_qr_lines(url: str) -> list[str]:
    if not url:
        return []
    try:
        import segno  # type: ignore
    except ImportError:
        return [
            "+" + "-" * (len(url) + 2) + "+",
            "| " + url + " |",
            "+" + "-" * (len(url) + 2) + "+",
            "(Install the optional `segno` package to render a scannable QR matrix.)",
        ]
    try:
        qr = segno.make(url, error="m")
        buffer: list[str] = []
        qr.terminal(out=type("Buf", (), {"write": lambda self, value: buffer.append(value)})(), border=1)
        # segno's terminal output ends each line with newline; flatten back into lines.
        return ("".join(buffer)).splitlines() or [url]
    except Exception:
        return [url]


def _append_lan_token(url: str, token: str) -> str:
    if not url or not token:
        return url
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}t={quote(token, safe='')}"


def _detect_lan_ip() -> str:
    """Best-effort detection of the host's primary LAN IPv4 address.

    Uses the standard UDP-socket trick: open a non-blocking connection to a
    routable but unreachable target and read the local socket name. This
    yields the address the OS would use for outbound traffic, which is the
    one a phone on the same LAN should target.
    """
    candidate = ""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.setblocking(False)
        try:
            s.connect(("10.255.255.255", 1))
            candidate = s.getsockname()[0]
        except OSError:
            candidate = ""
    finally:
        s.close()
    if candidate and not candidate.startswith("127."):
        return candidate
    try:
        fallback = socket.gethostbyname(socket.gethostname())
    except OSError:
        return ""
    if fallback and not fallback.startswith("127."):
        return fallback
    return ""


def _network_viewer_url(host: str, port: int, *, focus: str | None = None, read: bool = False, scheme: str = "http") -> str | None:
    if host not in {"0.0.0.0", "::", ""}:
        return None
    candidate = _detect_lan_ip()
    if not candidate:
        return None
    return build_viewer_url(candidate, port, focus=focus, read=read, scheme=scheme)


def _viewer_state_dir() -> Path:
    """Persistent state directory for the viewer (TLS material, devices, ...)."""
    return Path.home() / ".cache" / "logics-manager"


def _ensure_tls_material(san_ips: list[str]) -> tuple[Path, Path]:
    """Return (cert_path, key_path), generating a self-signed pair if missing.

    The cert covers the loopback addresses plus any provided LAN IPs as
    subjectAltNames so iOS/Android accept it after a one-time trust prompt.
    Shells out to ``openssl`` because we deliberately do not add a heavy
    native dependency just to mint a self-signed cert.
    """
    state_dir = _viewer_state_dir() / "tls"
    state_dir.mkdir(parents=True, exist_ok=True)
    cert_path = state_dir / "viewer-cert.pem"
    key_path = state_dir / "viewer-key.pem"
    if cert_path.exists() and key_path.exists():
        return cert_path, key_path
    if shutil.which("openssl") is None:
        raise SystemExit(
            "--tls requires either an existing cert pair under "
            f"{state_dir} or the 'openssl' binary to auto-generate one."
        )
    san_entries = ["DNS:localhost", "IP:127.0.0.1", "IP:::1"]
    seen: set[str] = set()
    for ip in san_ips:
        if not ip or ip in seen or ip.startswith("127.") or ip in {"0.0.0.0", "::"}:
            continue
        seen.add(ip)
        san_entries.append(f"IP:{ip}")
    cmd = [
        "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
        "-days", "365",
        "-keyout", str(key_path),
        "-out", str(cert_path),
        "-subj", "/CN=logics-manager-viewer",
        "-addext", f"subjectAltName={','.join(san_entries)}",
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except (subprocess.CalledProcessError, OSError) as exc:
        raise SystemExit(f"Failed to generate TLS material via openssl: {exc}") from exc
    try:
        os.chmod(key_path, 0o600)
    except OSError:
        pass
    return cert_path, key_path


def _build_tls_context(cert_path: Path, key_path: Path) -> ssl.SSLContext:
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))
    return context


_ANSI = {
    "reset": "\033[0m",
    "bold": "\033[1m",
    "dim": "\033[2m",
    "cyan": "\033[36m",
    "green": "\033[32m",
    "yellow": "\033[33m",
    "red": "\033[31m",
}


def _supports_banner_style() -> bool:
    """True when the start banner should be rendered with box + ANSI color.

    Styling is reserved for interactive terminals so piped/redirected output
    (logs, CI, `| cat`) stays plain, greppable, and copy-paste friendly.
    Honors the NO_COLOR convention and TERM=dumb.
    """
    if os.environ.get("NO_COLOR") is not None:
        return False
    if os.environ.get("TERM") == "dumb":
        return False
    try:
        return bool(sys.stdout.isatty())
    except (ValueError, AttributeError):
        return False


def _display_width(text: str) -> int:
    """Visible column width of text, accounting for wide/combining glyphs."""
    import unicodedata

    width = 0
    for ch in text:
        if unicodedata.combining(ch):
            continue
        width += 2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1
    return width


def _render_styled_start_status(
    url: str,
    repo_root: Path,
    *,
    mode_label: str,
    transport_label: str,
    bind_host: str,
    auto_refresh_interval_seconds: int,
    network_url: str | None,
    focus: str | None,
    version: str | None,
    lan_mode: bool,
    lan_rw_mode: bool,
    lan_token: str | None,
    lan_url: str | None,
    qr_lines: list[str] | None,
) -> str:
    a = _ANSI

    def paint(text: str, *codes: str) -> str:
        return "".join(a[c] for c in codes) + text + a["reset"]

    # Each row is (plain_text, colored_text); width is measured on the plain
    # text so ANSI escapes never disturb box alignment.
    rows: list[tuple[str, str]] = []
    arrow = "➜"
    rows.append((f"{arrow}  {url}", f"{paint(arrow, 'green', 'bold')}  {paint(url, 'cyan', 'bold')}"))
    rows.append(("", ""))

    def field(label: str, value: str, *value_codes: str) -> None:
        plain = f"{label:<10}{value}"
        colored = paint(f"{label:<10}", "dim") + (paint(value, *value_codes) if value_codes else value)
        rows.append((plain, colored))

    field("Repo", repo_root.name, "bold")
    field("Mode", mode_label)
    field("Transport", transport_label)
    field("Bind", bind_host)
    if network_url:
        field("Network", network_url, "cyan")
    field("Refresh", f"⟳ {auto_refresh_interval_seconds}s")
    if focus:
        field("Focus", focus, "yellow")

    content_w = max(_display_width(plain) for plain, _ in rows)

    title = "Logics viewer"
    version_text = f"v{version}" if version else ""
    # Top border: ╭─ <title> <dashes> <version> ─╮  (─╮ / ─ tail = 3 cols).
    # Left run "╭─ <title> " = 3 + width(title) + 1; tail with version =
    # 1(space) + width(version) + 3("  ─╮" -> " ─╮"=3). Reserve >=1 dash.
    left_run = 3 + _display_width(title) + 1
    tail_run = (1 + _display_width(version_text) + 3) if version_text else 3
    box_width = max(content_w + 7, left_run + 1 + tail_run)
    content_w = box_width - 7

    dashes = box_width - left_run - tail_run
    border = lambda s: paint(s, "dim")  # noqa: E731
    if version_text:
        top = (
            border("╭─ ") + paint(title, "green", "bold") + " "
            + border("─" * dashes) + " " + paint(version_text, "dim") + border(" ─╮")
        )
    else:
        top = border("╭─ ") + paint(title, "green", "bold") + " " + border("─" * dashes) + border(" ─╮")
    bottom = border("╰" + "─" * (box_width - 2) + "╯")

    out: list[str] = [top, border("│") + " " * (box_width - 2) + border("│")]
    for plain, colored in rows:
        pad = content_w - _display_width(plain)
        out.append(border("│") + "   " + colored + " " * pad + "  " + border("│"))
    out.append(border("│") + " " * (box_width - 2) + border("│"))
    out.append(bottom)

    if lan_mode:
        out.append("")
        if lan_rw_mode:
            out.append(paint("LAN read/write active", "yellow", "bold") + paint(" — token + PIN-paired device required to mutate state.", "yellow"))
        else:
            out.append(paint("LAN read-only active", "yellow", "bold") + paint(" — mutating endpoints refused; non-loopback clients need the token.", "yellow"))
        if lan_url:
            out.append(paint("Share URL  ", "dim") + paint(lan_url, "cyan"))
        if lan_token:
            out.append(paint("Token      ", "dim") + lan_token)
        if qr_lines:
            out.append("")
            out.extend(qr_lines)
    return "\n".join(out)


def render_start_status(
    url: str,
    repo_root: Path,
    *,
    focus: str | None = None,
    network_url: str | None = None,
    bind_host: str = "localhost",
    auto_refresh_interval_seconds: int = 15,
    lan_mode: bool = False,
    lan_rw_mode: bool = False,
    lan_token: str | None = None,
    lan_url: str | None = None,
    qr_lines: list[str] | None = None,
    tls_enabled: bool = False,
    version: str | None = None,
    styled: bool | None = None,
) -> str:
    if lan_rw_mode:
        mode_label = "LAN read/write (token + paired device required)"
    elif lan_mode:
        mode_label = "LAN read-only (token required)"
    else:
        mode_label = "read-only"
    transport_label = "HTTPS (self-signed)" if tls_enabled else "HTTP"

    if styled is None:
        styled = _supports_banner_style()
    if styled:
        return _render_styled_start_status(
            url,
            repo_root,
            mode_label=mode_label,
            transport_label=transport_label,
            bind_host=bind_host,
            auto_refresh_interval_seconds=auto_refresh_interval_seconds,
            network_url=network_url,
            focus=focus,
            version=version,
            lan_mode=lan_mode,
            lan_rw_mode=lan_rw_mode,
            lan_token=lan_token,
            lan_url=lan_url,
            qr_lines=qr_lines,
        )

    header = "Logics viewer running:" if not version else f"Logics viewer running (v{version}):"
    lines = [
        header,
        f"Local: {url}",
        "",
        f"Repo: {repo_root.name}",
        f"Mode: {mode_label}",
        f"Transport: {transport_label}",
        f"Bind: {bind_host}",
        f"Auto refresh: {auto_refresh_interval_seconds}s",
    ]
    if network_url:
        lines.insert(2, f"Network: {network_url}")
    if focus:
        lines.append(f"Focus: {focus}")
    if lan_mode:
        lines.append("")
        if lan_rw_mode:
            lines.append("LAN exposure is active in read/write mode. Devices need the session token AND a PIN-paired device token to mutate state.")
        else:
            lines.append("LAN exposure is active. Mutating endpoints are refused; non-loopback clients must present the session token below.")
        if lan_url:
            lines.append(f"Share URL: {lan_url}")
        if lan_token:
            lines.append(f"Token: {lan_token}")
        if qr_lines:
            lines.append("")
            lines.extend(qr_lines)
    return "\n".join(lines)
