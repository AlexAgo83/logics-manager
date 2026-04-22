from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any


DEFAULT_LOGICS_CONFIG: dict[str, Any] = {
    "version": 1,
    "workflow": {
        "split": {
            "policy": "minimal-coherent",
            "max_children_without_override": 4,
        }
    },
    "mutations": {
        "mode": "transactional",
        "audit_log": "logics/mutation_audit.jsonl",
    },
    "index": {
        "enabled": True,
        "path": "logics/.cache/runtime_index.json",
    },
    "hybrid_assist": {
        "default_backend": "auto",
        "next_step_auto_backend": None,
        "default_model_profile": "deepseek-coder",
        "default_model": "deepseek-coder-v2:16b",
        "env_file": ".env",
        "result_cache": {
            "enabled": True,
            "path": "logics/.cache/flow_results_cache.json",
            "ttl_seconds": 600,
        },
        "model_profiles": {
            "deepseek-coder": {
                "family": "deepseek",
                "model": "deepseek-coder-v2:16b",
                "description": "DeepSeek Coder V2 profile for shared local coding and hybrid assist work.",
                "example_tags": ["deepseek-coder-v2:16b", "deepseek-coder-v2:latest"],
            },
            "qwen-coder": {
                "family": "qwen",
                "model": "qwen2.5-coder:14b",
                "description": "Qwen coder profile for bounded local coding and hybrid assist work.",
                "example_tags": ["qwen2.5-coder:14b", "qwen2.5-coder:7b"],
            },
        },
        "ollama_host": "http://127.0.0.1:11434",
        "timeout_seconds": 20.0,
        "audit_log": "logics/.cache/hybrid_assist_audit.jsonl",
        "measurement_log": "logics/.cache/hybrid_assist_measurements.jsonl",
        "provider_health_path": "logics/.cache/provider_health.json",
        "providers": {
            "readiness_cooldown_seconds": 300,
            "ollama": {
                "enabled": True,
                "host": "http://127.0.0.1:11434",
            },
            "openai": {
                "enabled": False,
                "base_url": "https://api.openai.com/v1",
                "model": "gpt-4.1-mini",
                "api_key_env": "OPENAI_API_KEY",
            },
            "gemini": {
                "enabled": False,
                "base_url": "https://generativelanguage.googleapis.com/v1beta",
                "model": "gemini-2.0-flash",
                "api_key_env": "GEMINI_API_KEY",
            },
        },
    },
}


class ConfigError(SystemExit):
    pass


def _strip_comment(value: str) -> str:
    stripped = value.strip()
    if not stripped.startswith(('"', "'")) and "#" in stripped:
        stripped = stripped.split("#", 1)[0].rstrip()
    return stripped


def _coerce_scalar(value: str) -> Any:
    stripped = _strip_comment(value)
    if stripped in {"", "null", "Null", "NULL", "~"}:
        return None
    if stripped in {"true", "True"}:
        return True
    if stripped in {"false", "False"}:
        return False
    if stripped.startswith(("'", '"')) and stripped.endswith(("'", '"')) and len(stripped) >= 2:
        return stripped[1:-1]
    try:
        return int(stripped)
    except ValueError:
        pass
    try:
        return float(stripped)
    except ValueError:
        pass
    return stripped


def _prepared_lines(text: str) -> list[tuple[int, str]]:
    prepared: list[tuple[int, str]] = []
    for raw in text.splitlines():
        if not raw.strip():
            continue
        stripped = raw.lstrip(" ")
        if stripped.startswith("#"):
            continue
        indent = len(raw) - len(stripped)
        prepared.append((indent, stripped.rstrip()))
    return prepared


def _parse_block(lines: list[tuple[int, str]], index: int, indent: int) -> tuple[Any, int]:
    if index >= len(lines):
        return {}, index
    current_indent, content = lines[index]
    if current_indent < indent:
        return {}, index

    if content.startswith("- "):
        items: list[Any] = []
        while index < len(lines):
            current_indent, content = lines[index]
            if current_indent < indent:
                break
            if current_indent != indent or not content.startswith("- "):
                raise ConfigError(f"Invalid list indentation in logics.yaml near `{content}`.")
            item_content = content[2:].strip()
            index += 1
            if not item_content:
                if index < len(lines) and lines[index][0] > indent:
                    nested_indent = lines[index][0]
                    value, index = _parse_block(lines, index, nested_indent)
                else:
                    value = None
            elif ":" in item_content and not item_content.startswith(("'", '"')) and not item_content.endswith(":"):
                key, raw_value = item_content.split(":", 1)
                value = {key.strip(): _coerce_scalar(raw_value.strip())}
            elif item_content.endswith(":") and not item_content.startswith(("'", '"')):
                key = item_content[:-1].strip()
                if index < len(lines) and lines[index][0] > indent:
                    nested_indent = lines[index][0]
                    nested_value, index = _parse_block(lines, index, nested_indent)
                else:
                    nested_value = {}
                value = {key: nested_value}
            else:
                value = _coerce_scalar(item_content)
            items.append(value)
        return items, index

    mapping: dict[str, Any] = {}
    while index < len(lines):
        current_indent, content = lines[index]
        if current_indent < indent:
            break
        if current_indent != indent:
            raise ConfigError(f"Invalid mapping indentation in logics.yaml near `{content}`.")
        if ":" not in content:
            raise ConfigError(f"Expected `key: value` in logics.yaml, got `{content}`.")
        key, raw_value = content.split(":", 1)
        key = key.strip()
        raw_value = raw_value.strip()
        index += 1
        if raw_value:
            mapping[key] = _coerce_scalar(raw_value)
            continue
        if index < len(lines) and lines[index][0] > current_indent:
            nested_indent = lines[index][0]
            value, index = _parse_block(lines, index, nested_indent)
        else:
            value = {}
        mapping[key] = value
    return mapping, index


def parse_simple_yaml(text: str) -> dict[str, Any]:
    lines = _prepared_lines(text)
    if not lines:
        return {}
    parsed, index = _parse_block(lines, 0, lines[0][0])
    if index != len(lines):
        raise ConfigError("Could not parse the full logics.yaml payload.")
    if not isinstance(parsed, dict):
        raise ConfigError("logics.yaml must decode to a top-level mapping.")
    return parsed


def _deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(base)
    for key, value in override.items():
        current = merged.get(key)
        if isinstance(current, dict) and isinstance(value, dict):
            merged[key] = _deep_merge(current, value)
        else:
            merged[key] = value
    return merged


def find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "logics").is_dir():
            return candidate
    raise ConfigError("Could not locate repo root (missing 'logics/' directory). Run from inside the repo.")


def config_path(repo_root: Path) -> Path:
    return repo_root / "logics.yaml"


def load_repo_config(repo_root: Path) -> tuple[dict[str, Any], Path | None]:
    path = config_path(repo_root)
    if not path.is_file():
        return deepcopy(DEFAULT_LOGICS_CONFIG), None
    try:
        override = parse_simple_yaml(path.read_text(encoding="utf-8"))
    except ConfigError:
        raise
    except Exception as exc:
        raise ConfigError(f"Failed to parse {path.relative_to(repo_root)}: {exc}") from exc
    return _deep_merge(DEFAULT_LOGICS_CONFIG, override), path


def render_config_show(repo_root: Path, *, output_format: str = "text") -> str:
    config, path = load_repo_config(repo_root)
    payload = {
        "config_path": str(path.relative_to(repo_root)) if path is not None else None,
        "config": config,
    }
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)

    lines = [
        f"Config source: {payload['config_path'] or '<defaults>'}",
        f"Version: {config.get('version', 'unknown')}",
        f"Workflow split policy: {config.get('workflow', {}).get('split', {}).get('policy', 'unknown')}",
        f"Default backend: {config.get('hybrid_assist', {}).get('default_backend', 'unknown')}",
        f"Default model: {config.get('hybrid_assist', {}).get('default_model', 'unknown')}",
    ]
    return "\n".join(lines)
