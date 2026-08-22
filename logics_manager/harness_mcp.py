"""req_318/item_657: wire each detected harness's MCP config as part of
`bootstrap`, or print the exact snippet when auto-writing would be unsafe.

Only ever merges into a JSON MCP config file that already exists (Claude
Code project scope `.mcp.json`, Antigravity `~/.gemini/config/mcp_config.json`),
and never overwrites a differing existing entry under the `logics-manager`
key. Codex's `~/.codex/config.toml` gets a safe plain-text table append -
TOML tables are additive by dotted path, so this cannot collide with or
shadow an existing one. Hermes's `~/.hermes/config.yaml` is YAML, where the
same trick is unsafe (a second top-level key silently shadows an earlier one in
most parsers) - it only ever gets a printed snippet, never a write. A missing
JSON file gets a printed snippet too: never create a new global config file or
directory on the operator's behalf.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .skills import _real_home

MCP_ENTRY: dict[str, Any] = {"command": "logics-manager", "args": ["mcp", "serve"]}

_TOML_TABLE_HEADER = "[mcp_servers.logics-manager]"
_TOML_BLOCK = "\n".join([_TOML_TABLE_HEADER, 'command = "logics-manager"', 'args = ["mcp", "serve"]'])

_YAML_SNIPPET = "\n".join(["mcp_servers:", "  logics-manager:", '    command: "logics-manager"', '    args: ["mcp", "serve"]'])


def _merge_json_mcp_entry(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"path": path.as_posix(), "action": "unreadable"}
    if not isinstance(data, dict):
        return {"path": path.as_posix(), "action": "unreadable"}
    servers = data.get("mcpServers")
    if not isinstance(servers, dict):
        servers = {}
        data["mcpServers"] = servers
    existing = servers.get("logics-manager")
    if existing == MCP_ENTRY:
        return {"path": path.as_posix(), "action": "already-wired"}
    if existing is not None:
        return {"path": path.as_posix(), "action": "left-alone", "reason": "an existing logics-manager entry differs"}
    servers["logics-manager"] = MCP_ENTRY
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return {"path": path.as_posix(), "action": "wired"}


def _append_toml_mcp_entry(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8") if path.is_file() else ""
    if _TOML_TABLE_HEADER in text:
        return {"path": path.as_posix(), "action": "already-wired"}
    prefix = text if text.endswith("\n") or not text else text + "\n"
    separator = "\n" if prefix else ""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(prefix + separator + _TOML_BLOCK + "\n", encoding="utf-8")
    return {"path": path.as_posix(), "action": "wired"}


def _print_snippet(path: Path, snippet: str) -> dict[str, Any]:
    return {"path": path.as_posix(), "action": "print-snippet", "snippet": snippet}


def wire_harness_mcp_configs(repo_root: Path, *, home: Path | None = None) -> list[dict[str, Any]]:
    """One result per harness whose MCP config was touched or reported -
    a harness that is not detected on this machine at all produces nothing."""
    home = home or _real_home()
    results: list[dict[str, Any]] = []

    claude_path = repo_root / ".mcp.json"
    if claude_path.is_file():
        results.append({"harness": "claude-code (project)", **_merge_json_mcp_entry(claude_path)})

    if (home / ".gemini").is_dir():
        antigravity_path = home / ".gemini" / "config" / "mcp_config.json"
        if antigravity_path.is_file():
            results.append({"harness": "antigravity", **_merge_json_mcp_entry(antigravity_path)})
        else:
            results.append({"harness": "antigravity", **_print_snippet(antigravity_path, json.dumps({"mcpServers": {"logics-manager": MCP_ENTRY}}, indent=2))})

    if (home / ".codex").is_dir():
        codex_path = home / ".codex" / "config.toml"
        results.append({"harness": "codex", **_append_toml_mcp_entry(codex_path)})

    if (home / ".hermes").is_dir():
        hermes_path = home / ".hermes" / "config.yaml"
        results.append({"harness": "hermes", **_print_snippet(hermes_path, _YAML_SNIPPET)})

    return results
