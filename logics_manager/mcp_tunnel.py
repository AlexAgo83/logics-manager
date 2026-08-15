"""OpenAI's Secure MCP Tunnel: the transport ChatGPT uses (adr_031).

`tunnel-client` connects outbound to OpenAI's control plane and drives
`logics-manager mcp serve` over stdio. Nothing here is published, no URL is
created, and the `tunnel_id` ChatGPT holds lives in the tunnel-client profile --
so it survives every stop and start, which the localtunnel path never could.

The binary is an optional external tool, exactly like the `npx localtunnel` the
older path shells out to: this module builds commands and reads results, and the
caller supplies the runner. Nothing here shells out on import, and the test suite
never needs `tunnel-client` installed.
"""

from __future__ import annotations

import os
import re
import shutil
from collections.abc import Callable, Iterable, Mapping
from pathlib import Path
from typing import Any

TUNNEL_BINARY = "tunnel-client"
DEFAULT_PROFILE = "logics-manager"

# The API key is machine-level, not per-repository: one connector serves every
# project on the machine, so its credentials never live in a project file.
CONFIG_ENV_VAR = "LOGICS_MANAGER_TUNNEL_CONFIG"
PROFILE_ENV_VAR = "LOGICS_MANAGER_TUNNEL_PROFILE"
API_KEY_ENV_VAR = "CONTROL_PLANE_API_KEY"

INSTALL_COMMAND = ["brew", "install", "openai/tools/tunnel-client"]
INSTALL_FALLBACK = (
    "Homebrew is not on this machine. Install tunnel-client from the GitHub release "
    "for this platform, or run the ghcr.io/openai/tunnel-client image, and put it on PATH."
)

CONFIG_TEMPLATE = f"""# logics-manager: OpenAI Secure MCP Tunnel credentials (this machine, every project).
# Owner-readable only. Environment variables of the same name take precedence.
# The tunnel_id is not here -- it belongs to the tunnel-client profile named below.
{PROFILE_ENV_VAR}={DEFAULT_PROFILE}
{API_KEY_ENV_VAR}=
"""

# What the operator has to fix, and where. One reason per way this fails before
# it starts, because "the connector did not start" is not something to act on.
REASON_BINARY_MISSING = "binary_missing"
REASON_PROFILE_MISSING = "profile_missing"
REASON_API_KEY_MISSING = "api_key_missing"
REASON_API_KEY_REJECTED = "api_key_rejected"

# `tunnel-client doctor` names each failed check; these are the ones we can route.
_PROFILE_CHECKS = ("profile", "tunnel_id", "mcp_command", "config")
_API_KEY_CHECKS = ("control_plane_api_key", "api_key")


def machine_home() -> Path:
    """The account's real home, not whatever `$HOME` currently points at.

    One connector serves every project on the machine, so its credentials belong to
    the operator's account -- not to a session. `Path.home()` reads `$HOME`, and a
    sandboxed session (a CDX profile, a container, a service unit) moves it: the key
    would land in that profile, and the next session would be told it has no key.
    The passwd entry is the account, whoever moved the variable.
    """
    try:
        import pwd  # POSIX only; Windows has no passwd database to consult.

        return Path(pwd.getpwuid(os.getuid()).pw_dir)
    except (ImportError, KeyError, AttributeError):
        return Path.home()


def config_path(env: Mapping[str, str] | None = None) -> Path:
    """Where the machine's tunnel credentials live."""
    environ = os.environ if env is None else env
    override = environ.get(CONFIG_ENV_VAR)
    if override:
        return Path(override).expanduser()
    return machine_home() / ".config" / "logics-manager" / "tunnel.env"


def ensure_config_file(path: Path) -> Path:
    """Create the credentials file, owner-only, so there is somewhere to put the key.

    Telling an operator to fill a file that does not exist is telling them nothing.
    """
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(CONFIG_TEMPLATE, encoding="utf-8")
    path.chmod(0o600)
    return path


def read_config_file(path: Path) -> dict[str, str]:
    """Read KEY=VALUE lines. Anything unparseable is skipped, never guessed at."""
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def tunnel_settings(env: Mapping[str, str] | None = None) -> dict[str, Any]:
    """Resolve the profile name and API key. Environment wins over the file."""
    environ = dict(os.environ if env is None else env)
    path = config_path(environ)
    stored = read_config_file(path)
    profile = environ.get(PROFILE_ENV_VAR) or stored.get(PROFILE_ENV_VAR) or DEFAULT_PROFILE
    api_key = environ.get(API_KEY_ENV_VAR) or stored.get(API_KEY_ENV_VAR) or ""
    # The value itself never leaves this dict's `has_api_key`; callers that need to
    # run the child get it through `child_environment`.
    return {"profile": profile, "api_key": api_key, "has_api_key": bool(api_key), "config_path": path}


def child_environment(settings: Mapping[str, Any], env: Mapping[str, str] | None = None) -> dict[str, str]:
    """The environment `tunnel-client` runs under, with the key passed through.

    `HOME` is pinned to the account's home for the same reason our own config is
    (`machine_home`): tunnel-client keeps its profile under `$HOME/.config/tunnel-client`,
    so a viewer started from a sandboxed session would create the profile inside that
    session and lose it -- one machine, one profile, whoever started the viewer.
    """
    environ = dict(os.environ if env is None else env)
    environ["HOME"] = machine_home().as_posix()
    api_key = str(settings.get("api_key") or "")
    if api_key:
        environ[API_KEY_ENV_VAR] = api_key
    return environ


def build_run_command(profile: str) -> list[str]:
    return [TUNNEL_BINARY, "run", "--profile", profile]


def build_doctor_command(profile: str) -> list[str]:
    return [TUNNEL_BINARY, "doctor", "--profile", profile]


def build_init_command(profile: str, tunnel_id: str, repo_root: Path | str) -> list[str]:
    """Create the profile. It owns the `tunnel_id`; logics-manager holds only the name."""
    root = Path(repo_root).as_posix()
    return [
        TUNNEL_BINARY,
        "init",
        "--profile",
        profile,
        "--tunnel-id",
        tunnel_id,
        "--mcp-command",
        f"logics-manager mcp serve --repo-root {root}",
    ]


def binary_installed(which: Callable[[str], str | None] | None = None) -> bool:
    # Resolved at call time, not bound as a default: a default argument captures
    # `shutil.which` itself, which no monkeypatch of the module can then reach.
    return bool((which or shutil.which)(TUNNEL_BINARY))


def parse_doctor_output(returncode: int, output: str) -> dict[str, Any]:
    """Read `tunnel-client doctor`'s own verdict rather than re-deriving it.

    It reports each check by name and exits 2 with a FAILED_CHECKS line naming the
    culprit; nothing this module could invent would be more accurate than that.
    """
    failed: list[str] = []
    match = re.search(r"FAILED_CHECKS[:=]\s*(.+)", output)
    if match:
        failed = [name.strip() for name in re.split(r"[,\s]+", match.group(1)) if name.strip()]
    ok = returncode == 0 and not failed
    return {"ok": ok, "returncode": returncode, "failed_checks": failed}


def doctor_reason(failed_checks: Iterable[str]) -> str:
    """Route the named checks to the one thing the operator has to do."""
    names = [name.casefold() for name in failed_checks]
    if any(any(check in name for check in _API_KEY_CHECKS) for name in names):
        return REASON_API_KEY_MISSING
    if any(any(check in name for check in _PROFILE_CHECKS) for name in names):
        return REASON_PROFILE_MISSING
    return ""


def explain(reason: str, settings: Mapping[str, Any]) -> str:
    """One actionable sentence per way this fails. Never prints a secret."""
    path = settings.get("config_path", "")
    profile = settings.get("profile", DEFAULT_PROFILE)
    if reason == REASON_BINARY_MISSING:
        return f"tunnel-client is not installed. Install it with `{' '.join(INSTALL_COMMAND)}` -- the connector can run it for you."
    if reason == REASON_PROFILE_MISSING:
        return f"No tunnel-client profile named '{profile}'. Create it with the tunnel_id from your ChatGPT connector."
    if reason == REASON_API_KEY_MISSING:
        return f"No control-plane API key. Put it in {path} as {API_KEY_ENV_VAR}=<key>, or export {API_KEY_ENV_VAR}."
    if reason == REASON_API_KEY_REJECTED:
        return f"The control plane refused the API key (401). Replace {API_KEY_ENV_VAR} in {path} with a key scoped to this tunnel."
    return ""


# `doctor` only checks the variable is set, so a wrong or unscoped key passes it and
# then fails as a repeating 401 -- which looks exactly like a connector that started.
_REJECTED_KEY = re.compile(r"\b401\b|unauthoriz|invalid api key|forbidden", re.IGNORECASE)


def is_rejected_key(line: str) -> bool:
    return bool(_REJECTED_KEY.search(line))


# The URL `tunnel-client doctor` itself prints as tunnels_management_url.
TUNNEL_CONSOLE_URL = "https://platform.openai.com/settings/organization/tunnels"


def write_api_key(path: Path, api_key: str) -> Path:
    """Store the key in the machine config, owner-only, and never anywhere else."""
    api_key = api_key.strip()
    if not api_key:
        raise ValueError("An API key is required.")
    ensure_config_file(path)
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if not line.startswith(f"{API_KEY_ENV_VAR}=")]
    lines.append(f"{API_KEY_ENV_VAR}={api_key}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    path.chmod(0o600)
    return path


def prerequisite_rows(
    settings: Mapping[str, Any],
    status: Mapping[str, Any],
    *,
    profile_exists: bool,
    running: bool = False,
    connected: bool = False,
) -> list[dict[str, Any]]:
    """The ChatGPT path as rows, each carrying its state and at most one action.

    The steps have a forced order, so an unmet row renders reachable-but-inactive
    rather than hidden: the remaining path stays visible and the wrong order is never
    offered. Nothing about the operator's progress is persisted -- every row is derived
    from the machine's real state, so a step done by hand in a terminal shows up on the
    next read.
    """
    reason = str(status.get("reason") or "")
    rows = [
        {
            "id": "binary",
            "label": "tunnel-client installed",
            "met": reason != REASON_BINARY_MISSING,
            "action": "install",
            "action_label": "Install tunnel-client",
            "detail": f"Installed with `{' '.join(INSTALL_COMMAND)}` on your confirmation.",
        },
        {
            "id": "api_key",
            "label": "Control-plane API key",
            "met": bool(settings.get("has_api_key")) and reason != REASON_API_KEY_REJECTED,
            "action": "save-key",
            "action_label": "Save the key",
            # The value is never rendered back: the row says configured, and offers replacing it.
            "detail": f"Stored owner-only in {settings.get('config_path', '')}. Never shown again.",
        },
        {
            "id": "tunnel",
            "label": "Tunnel created on OpenAI",
            "met": profile_exists,
            "action": "open-console",
            "action_label": "Open the tunnel console",
            "detail": TUNNEL_CONSOLE_URL,
            "url": TUNNEL_CONSOLE_URL,
        },
        {
            "id": "profile",
            "label": f"tunnel-client profile '{settings.get('profile', DEFAULT_PROFILE)}'",
            "met": profile_exists,
            "action": "init-profile",
            "action_label": "Create the profile",
            "detail": "Paste the tunnel ID from the console. It is written to the profile, never to this repository.",
        },
        {
            "id": "plugin",
            "label": "ChatGPT reaching this repository",
            "met": connected,
            "action": "",
            "action_label": "",
            "detail": "Flips to connected on the first request ChatGPT actually makes." if running else "Starts once the connector is on.",
        },
    ]
    # Exactly one actionable row at a time, in order.
    actionable = next((row for row in rows if not row["met"] and row["action"]), None)
    for row in rows:
        row["actionable"] = row is actionable
    return rows


def check_prerequisites(
    settings: Mapping[str, Any],
    *,
    run_doctor: Callable[[list[str]], tuple[int, str]] | None = None,
    which: Callable[[str], str | None] | None = None,
) -> dict[str, Any]:
    """Everything that must hold before `tunnel-client run` is worth starting.

    Returns `{"ok", "reason", "message", "failed_checks"}`; `reason` is empty when
    the connector can start.
    """
    profile = str(settings.get("profile") or DEFAULT_PROFILE)
    if not binary_installed(which):
        return {"ok": False, "reason": REASON_BINARY_MISSING, "message": explain(REASON_BINARY_MISSING, settings), "failed_checks": []}
    if run_doctor is None:
        return {"ok": True, "reason": "", "message": "", "failed_checks": []}
    returncode, output = run_doctor(build_doctor_command(profile))
    verdict = parse_doctor_output(returncode, output)
    if verdict["ok"]:
        return {"ok": True, "reason": "", "message": "", "failed_checks": []}
    # An unset key is ours to route even when doctor did not name it: doctor reads the
    # process environment, and the file we read is not in it until we pass it through.
    reason = doctor_reason(verdict["failed_checks"])
    if not reason:
        reason = REASON_API_KEY_MISSING if not settings.get("has_api_key") else REASON_PROFILE_MISSING
    return {"ok": False, "reason": reason, "message": explain(reason, settings), "failed_checks": verdict["failed_checks"]}
