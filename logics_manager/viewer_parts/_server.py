STATUS_CACHE_TTL_SECONDS = 2.0
VIEWER_EVENT_POLL_SECONDS = 1.0
VIEWER_EVENT_REMOTE_POLL_SECONDS = 5.0


VIEWER_MUTATING_ROUTES = frozenset(
    {
        "/api/edit",
        "/api/git-commit",
        "/api/open-file",
        "/api/open-repo-folder",
        "/api/bootstrap-logics",
        "/api/new-request",
        "/api/restart-viewer",
        "/api/switch-project",
        "/api/select-project-root",
        "/api/select-project-root-path",
        "/api/cdx-report-request",
        "/api/cdx-mission-run",
        "/api/cdx-mission-apply-plan",
        "/api/workshop-command-start",
        "/api/workshop-command-stop",
        "/api/workshop-terminal-start",
        "/api/workshop-terminal-stop",
        "/api/workshop-terminal-input",
        "/api/workshop-terminal-resize",
        "/api/workshop-terminal-rename",
        "/api/cdx-import",
        "/api/cdx-export",
        "/api/cdx-toggle",
        "/api/cdx-permission",
        "/api/cdx-config",
        "/api/cdx-remove",
        "/api/release-reset",
        "/api/update-status",
        "/api/lan/devices/revoke",
    }
)


class LogicsViewerServer(ThreadingHTTPServer):
    daemon_threads = True
    block_on_close = False

    def __init__(
        self,
        server_address: tuple[str, int],
        repo_root: Path,
        *,
        auto_refresh_interval_seconds: int = 15,
        auto_refresh_interval_forced: bool = False,
        lan_mode: bool = False,
        lan_rw_mode: bool = False,
        tls_context: ssl.SSLContext | None = None,
    ):
        self.launch_repo_root = repo_root.resolve()
        self.project_roots = discover_viewer_project_roots(self.launch_repo_root)
        self.project_root_by_id = {_viewer_project_id(root): root.resolve() for root in self.project_roots}
        self.active_project_id = _viewer_project_id(self.launch_repo_root)
        self.repo_root = self.launch_repo_root
        self.project_picker_base_root = Path.home().resolve()
        try:
            self.project_picker_initial_path = self.launch_repo_root.parent.relative_to(self.project_picker_base_root).as_posix()
        except ValueError:
            self.project_picker_base_root = self.launch_repo_root.parent
            self.project_picker_initial_path = ""
        self.auto_refresh_interval_seconds = auto_refresh_interval_seconds
        self.auto_refresh_interval_forced = auto_refresh_interval_forced
        self.lan_mode = bool(lan_mode)
        self.lan_rw_mode = bool(lan_rw_mode) and self.lan_mode
        self.lan_token = secrets.token_urlsafe(32) if self.lan_mode else ""
        self.tls_enabled = tls_context is not None
        self.device_registry = LanDeviceRegistry(_viewer_state_dir() / "devices.json") if self.lan_rw_mode else None
        self.pairing_broker = LanPairingBroker() if self.lan_rw_mode else None
        self.workshop_sessions = WorkshopSessionRegistry()
        self.workshop_terminals = WorkshopTerminalRegistry()
        self.restart_requested = False
        # Cache of (monotonic_ts, etag, body_bytes) keyed by "<route>::<repo_root>".
        self.status_cache: dict[str, tuple[float, str, bytes]] = {}
        # Cache of (monotonic_ts, payload) keyed by "<component>::<repo_root>",
        # shared between the individual status endpoints and the consolidated
        # /api/status so an open screen and the badge refresh in the same tick
        # do not each recompute the same component.
        self.status_components: dict[str, tuple[float, Any]] = {}
        self.status_cache_lock = threading.Lock()
        self.event_seq = 0
        super().__init__(server_address, LogicsViewerRequestHandler)
        if tls_context is not None:
            self.socket = tls_context.wrap_socket(self.socket, server_side=True)

    @property
    def url_scheme(self) -> str:
        return "https" if self.tls_enabled else "http"

    def server_close(self) -> None:
        try:
            self.workshop_sessions.shutdown()
        finally:
            try:
                self.workshop_terminals.shutdown()
            finally:
                super().server_close()

    def project_registry_payload(self) -> list[dict[str, Any]]:
        return viewer_project_registry(self.repo_root, project_roots=self.project_roots)

    def status_component(self, name: str, producer: Any) -> Any:
        """Return a status component payload, recomputing at most once per TTL.

        Shared by the individual status endpoints and the consolidated
        /api/status so concurrent consumers reuse a single computation.
        """
        key = f"{name}::{self.repo_root}"
        now = time.monotonic()
        with self.status_cache_lock:
            entry = self.status_components.get(key)
            if entry is not None and (now - entry[0]) < STATUS_CACHE_TTL_SECONDS:
                return entry[1]
        value = producer()
        with self.status_cache_lock:
            self.status_components[key] = (time.monotonic(), value)
        return value

    def invalidate_status_components(self, names: set[str] | None = None) -> None:
        with self.status_cache_lock:
            if names is None:
                self.status_cache.clear()
                self.status_components.clear()
                return
            route_names = {
                "git": {"git-status", "status"},
                "ci": {"ci-status", "status"},
                "releaseRuns": {"release-runs", "status"},
                "cdx": {"cdx-status", "cdx-runs", "cdx-history", "status"},
                "cdxRuns": {"cdx-runs", "status"},
                "cdxHistory": {"cdx-history"},
            }
            component_names = set(names)
            cache_names: set[str] = set()
            for name in component_names:
                cache_names.update(route_names.get(name, {name, "status"}))
            for key in list(self.status_components):
                if key.split("::", 1)[0] in component_names:
                    self.status_components.pop(key, None)
            for key in list(self.status_cache):
                if key.split("::", 1)[0] in cache_names:
                    self.status_cache.pop(key, None)

    def next_event_seq(self) -> int:
        with self.status_cache_lock:
            self.event_seq += 1
            return self.event_seq

    def viewer_payload(self, *, selected_id: str | None = None) -> dict[str, Any]:
        payload = viewer_data_payload(
            self.repo_root,
            selected_id=selected_id,
            auto_refresh_interval_seconds=self.auto_refresh_interval_seconds,
            auto_refresh_interval_forced=self.auto_refresh_interval_forced,
            projects=self.project_registry_payload(),
        )
        payload["lanMode"] = bool(self.lan_mode)
        payload["lanRwMode"] = bool(self.lan_rw_mode)
        if self.lan_mode and self.lan_token:
            host, port = self.server_address[:2]
            lan_url = (
                _network_viewer_url(str(host), int(port), scheme=self.url_scheme)
                or build_viewer_url(str(host), int(port), scheme=self.url_scheme)
            )
            payload["lanShareUrl"] = _append_lan_token(lan_url, self.lan_token)
        else:
            payload["lanShareUrl"] = ""
        return payload

    def switch_project(self, project_id: str) -> dict[str, Any]:
        target = self.project_root_by_id.get(project_id)
        if target is None:
            raise ValueError("Unknown project id.")
        if not target.is_dir():
            raise FileNotFoundError(str(target))
        self.active_project_id = project_id
        self.repo_root = target
        return self.viewer_payload()

    def switch_project_root(self, project_root: Path) -> dict[str, Any]:
        target = project_root.expanduser().resolve()
        if not target.is_dir():
            raise FileNotFoundError(str(target))
        project_id = _viewer_project_id(target)
        if project_id not in self.project_root_by_id:
            self.project_roots.append(target)
            self.project_root_by_id[project_id] = target
        return self.switch_project(project_id)

    def request_restart(self) -> None:
        if self.restart_requested:
            return
        self.restart_requested = True

        def restart() -> None:
            time.sleep(0.2)
            self.shutdown()

        threading.Thread(target=restart, daemon=True).start()
