from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
from http import HTTPStatus
from pathlib import Path
from typing import Any


CONFIG_FILE = ".logics-viewer.json"
MAX_SOURCE_BYTES = 1_000_000
MAX_LOCALES = 20
MAX_KEYS = 10_000
LOCALE_DIRS = ("src/i18n", "src/locales", "locales", "messages")
INLINE_I18N_FILES = ("src/i18n.ts", "src/i18n.js", "src/lib/i18n.ts", "src/lib/i18n.js", "src/app/lib/i18n.ts", "src/app/lib/i18n.js")
THEME_CSS_FILES = ("src/theme.css", "src/styles.css", "styles/theme.css", "app/globals.css", "src/app.css")
THEME_CODE_FILES = ("src/theme.ts", "src/theme.js", "src/lib/theme.ts", "src/lib/theme.js", "src/app/lib/themeModes.ts", "src/prefs/theme.ts")
MUTATING_ROUTES = {"/api/project-i18n-value", "/api/project-theme-value"}
LOCALE_NAME = re.compile(r"^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})?$")
CSS_VAR = re.compile(r"(--[A-Za-z0-9_-]+)\s*:\s*([^;{}]+);", re.MULTILINE)
CSS_BLOCK = re.compile(r"([^{}]+)\{([^{}]*)\}", re.MULTILINE)


def _capability(state: str, available: bool, message: str, **detail: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {"state": state, "available": available, "message": message}
    if detail:
        payload["detail"] = detail
    return payload


def _inside_file(root: Path, rel_path: str) -> Path:
    normalized = str(rel_path or "").replace("\\", "/").lstrip("/")
    target = (root / normalized).resolve()
    resolved_root = root.resolve()
    if resolved_root not in target.parents:
        raise ValueError("Project tool source escapes repository root.")
    if not target.is_file():
        raise FileNotFoundError(normalized)
    return target


def _read_text(path: Path) -> str:
    if path.stat().st_size > MAX_SOURCE_BYTES:
        raise ValueError(f"Project tool source exceeds {MAX_SOURCE_BYTES} bytes.")
    return path.read_text(encoding="utf-8")


def _revision(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _config(root: Path) -> dict[str, Any]:
    path = root / CONFIG_FILE
    if not path.is_file():
        return {}
    try:
        value = json.loads(_read_text(path))
    except (json.JSONDecodeError, OSError, UnicodeError, ValueError):
        return {"_error": f"Invalid {CONFIG_FILE}."}
    return value if isinstance(value, dict) else {"_error": f"Invalid {CONFIG_FILE}."}


def _json_catalog_files(root: Path, configured: str = "") -> list[Path]:
    directories = (configured,) if configured else LOCALE_DIRS
    matches: list[list[Path]] = []
    for rel_dir in directories:
        directory = (root / rel_dir).resolve()
        if root.resolve() not in directory.parents or not directory.is_dir():
            continue
        files = sorted(
            path for path in directory.iterdir()
            if path.is_file() and path.suffix.lower() == ".json" and LOCALE_NAME.fullmatch(path.stem)
        )
        if 1 < len(files) <= MAX_LOCALES:
            matches.append(files)
    if len(matches) > 1:
        raise ValueError("Multiple translation catalogs detected; configure i18n.directory explicitly.")
    return matches[0] if matches else []


def detect_project_tools(root: Path) -> dict[str, Any]:
    config = _config(root)
    if config.get("_error"):
        unavailable = _capability("error", False, str(config["_error"]))
        return {"i18n": unavailable, "theme": unavailable.copy()}

    i18n_config = config.get("i18n") if isinstance(config.get("i18n"), dict) else {}
    i18n_dir = str(i18n_config.get("directory") or "")
    try:
        catalogs = _json_catalog_files(root, i18n_dir)
    except ValueError as exc:
        catalogs = []
        i18n_error = str(exc)
    except OSError:
        catalogs = []
        i18n_error = "Unable to inspect translation sources."
    else:
        i18n_error = f"Configured translation directory is unavailable: {i18n_dir}." if i18n_dir and not catalogs else ""
    if catalogs:
        paths = [path.relative_to(root.resolve()).as_posix() for path in catalogs]
        source_locale = str(i18n_config.get("sourceLocale") or catalogs[0].stem)
        i18n = _capability(
            "ready", True, "JSON locale catalog detected.", convention="json-catalog",
            editable=True, paths=paths, sourceLocale=source_locale,
        )
    elif i18n_error:
        i18n = _capability("error", False, i18n_error)
    else:
        inline = next((rel for rel in INLINE_I18N_FILES if (root / rel).is_file()), "")
        i18n = _capability(
            "read-only" if inline else "hidden", bool(inline),
            "Source-defined translations detected; inspection is read-only." if inline else "No supported translation convention detected.",
            **({"convention": "source-dictionary", "editable": False, "paths": [inline]} if inline else {}),
        )

    theme_config = config.get("theme") if isinstance(config.get("theme"), dict) else {}
    configured_theme = str(theme_config.get("path") or "")
    candidates = (configured_theme,) if configured_theme else THEME_CSS_FILES
    css_matches: list[str] = []
    for rel in candidates:
        try:
            path = _inside_file(root, rel)
            if CSS_VAR.search(_read_text(path)):
                css_matches.append(path.relative_to(root.resolve()).as_posix())
        except (FileNotFoundError, OSError, UnicodeError, ValueError):
            continue
    if len(css_matches) > 1:
        theme = _capability("error", False, "Multiple theme token files detected; configure theme.path explicitly.")
    elif configured_theme and not css_matches:
        theme = _capability("error", False, f"Configured theme source is unavailable: {configured_theme}.")
    elif css_matches:
        css_path = css_matches[0]
        theme = _capability(
            "ready", True, "CSS custom-property theme detected.", convention="css-custom-properties",
            editable=True, paths=[css_path],
        )
    else:
        code_path = next((rel for rel in THEME_CODE_FILES if (root / rel).is_file()), "")
        theme = _capability(
            "read-only" if code_path else "hidden", bool(code_path),
            "Source-defined theme modes detected; inspection is read-only." if code_path else "No supported theme convention detected.",
            **({"convention": "source-theme-modes", "editable": False, "paths": [code_path]} if code_path else {}),
        )
    return {"i18n": i18n, "theme": theme}


def _flatten(value: Any, prefix: str = "") -> dict[str, str]:
    result: dict[str, str] = {}
    if isinstance(value, dict):
        for key in sorted(value):
            child = f"{prefix}.{key}" if prefix else str(key)
            result.update(_flatten(value[key], child))
        return result
    if not isinstance(value, str):
        raise ValueError(f"Translation value at {prefix or '<root>'} must be a string.")
    result[prefix] = value
    return result


def i18n_payload(root: Path) -> dict[str, Any]:
    capability = detect_project_tools(root)["i18n"]
    if not capability.get("available"):
        raise ValueError(capability["message"])
    detail = capability.get("detail", {})
    if detail.get("convention") != "json-catalog":
        return {"state": "read-only", "capability": capability, "locales": [], "rows": []}
    locales: list[dict[str, Any]] = []
    all_keys: set[str] = set()
    for rel_path in detail.get("paths", []):
        path = _inside_file(root, rel_path)
        text = _read_text(path)
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid translation JSON in {rel_path}: {exc.msg}.") from exc
        values = _flatten(parsed)
        all_keys.update(values)
        locales.append({"id": path.stem, "path": rel_path, "revision": _revision(text), "values": values})
    if len(all_keys) > MAX_KEYS:
        raise ValueError(f"Translation catalog exceeds {MAX_KEYS} keys.")
    rows = [
        {"key": key, "values": {locale["id"]: locale["values"].get(key) for locale in locales}}
        for key in sorted(all_keys)
    ]
    source = str(detail.get("sourceLocale") or locales[0]["id"])
    source_keys = set(next((item["values"] for item in locales if item["id"] == source), {}))
    diagnostics = {
        item["id"]: {
            "missing": sorted(source_keys - set(item["values"])),
            "extra": sorted(set(item["values"]) - source_keys),
            "empty": sorted(key for key, value in item["values"].items() if not value.strip()),
        }
        for item in locales
    }
    for locale in locales:
        locale.pop("values", None)
    return {"state": "ready", "capability": capability, "sourceLocale": source, "locales": locales, "rows": rows, "diagnostics": diagnostics}


def _set_nested(value: dict[str, Any], dotted_key: str, replacement: str) -> None:
    parts = dotted_key.split(".")
    if not parts or any(not part for part in parts):
        raise ValueError("Invalid translation key.")
    cursor: dict[str, Any] = value
    for part in parts[:-1]:
        child = cursor.get(part)
        if not isinstance(child, dict):
            raise ValueError("Translation key does not exist.")
        cursor = child
    if parts[-1] not in cursor or not isinstance(cursor[parts[-1]], str):
        raise ValueError("Translation key does not exist.")
    cursor[parts[-1]] = replacement


def _atomic_write(path: Path, content: str) -> None:
    handle, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    except Exception:
        try:
            os.unlink(temporary)
        except OSError:
            pass
        raise


def update_i18n_value(root: Path, *, locale: str, key: str, value: str, revision: str) -> dict[str, Any]:
    capability = detect_project_tools(root)["i18n"]
    detail = capability.get("detail", {})
    if not detail.get("editable") or detail.get("convention") != "json-catalog":
        raise ValueError("Translation source is not editable.")
    rel_path = next((rel for rel in detail.get("paths", []) if Path(rel).stem == locale), "")
    if not rel_path:
        raise ValueError("Unknown locale.")
    path = _inside_file(root, rel_path)
    text = _read_text(path)
    if _revision(text) != revision:
        raise ValueError("Translation catalog changed; reload before saving.")
    parsed = json.loads(text)
    if not isinstance(parsed, dict):
        raise ValueError("Translation catalog root must be an object.")
    _set_nested(parsed, key, value)
    indent = 2 if "\n  \"" in text else 4 if "\n    \"" in text else 2
    rendered = json.dumps(parsed, ensure_ascii=False, indent=indent) + ("\n" if text.endswith("\n") else "")
    _atomic_write(path, rendered)
    return i18n_payload(root)


def _theme_group(name: str, value: str) -> str:
    probe = f"{name} {value}".lower()
    if any(word in probe for word in ("color", "background", "foreground", "accent", "#", "rgb(", "hsl(")):
        return "colors"
    if any(word in probe for word in ("font", "line-height", "letter-spacing")):
        return "typography"
    if "radius" in probe:
        return "radii"
    if "shadow" in probe:
        return "shadows"
    if any(word in probe for word in ("space", "gap", "padding", "margin")):
        return "spacing"
    return "other"


def theme_payload(root: Path) -> dict[str, Any]:
    capability = detect_project_tools(root)["theme"]
    if not capability.get("available"):
        raise ValueError(capability["message"])
    detail = capability.get("detail", {})
    if detail.get("convention") != "css-custom-properties":
        return {"state": "read-only", "capability": capability, "selectors": []}
    rel_path = detail["paths"][0]
    text = _read_text(_inside_file(root, rel_path))
    selectors = []
    for selector_text, body in CSS_BLOCK.findall(text):
        tokens = [
            {"name": name, "value": value.strip(), "group": _theme_group(name, value)}
            for name, value in CSS_VAR.findall(body)
        ]
        if tokens:
            selectors.append({"selector": selector_text.strip(), "tokens": tokens})
    return {"state": "ready", "capability": capability, "path": rel_path, "revision": _revision(text), "selectors": selectors}


def update_theme_value(root: Path, *, selector: str, name: str, value: str, revision: str) -> dict[str, Any]:
    capability = detect_project_tools(root)["theme"]
    detail = capability.get("detail", {})
    if not detail.get("editable") or detail.get("convention") != "css-custom-properties":
        raise ValueError("Theme source is not editable.")
    if not re.fullmatch(r"--[A-Za-z0-9_-]+", name) or not value.strip() or len(value) > 500:
        raise ValueError("Invalid CSS custom-property value.")
    if any(fragment in value for fragment in (";", "{", "}", "/*", "*/")):
        raise ValueError("CSS custom-property value may not change stylesheet structure.")
    path = _inside_file(root, detail["paths"][0])
    text = _read_text(path)
    if _revision(text) != revision:
        raise ValueError("Theme source changed; reload before saving.")
    matches: list[tuple[int, int, str]] = []
    for block in CSS_BLOCK.finditer(text):
        if block.group(1).strip() != selector:
            continue
        for token in CSS_VAR.finditer(block.group(2)):
            if token.group(1) == name:
                start = block.start(2) + token.start(2)
                end = block.start(2) + token.end(2)
                matches.append((start, end, token.group(2)))
    if len(matches) != 1:
        raise ValueError("Theme declaration is missing or ambiguous.")
    start, end, old_value = matches[0]
    leading = old_value[: len(old_value) - len(old_value.lstrip())]
    trailing = old_value[len(old_value.rstrip()):]
    rendered = text[:start] + leading + value.strip() + trailing + text[end:]
    _atomic_write(path, rendered)
    return theme_payload(root)


def handle_get(handler: Any, route: str) -> bool:
    producers = {"/api/project-i18n": i18n_payload, "/api/project-theme": theme_payload}
    producer = producers.get(route)
    if producer is None:
        return False
    try:
        handler._send_json({"ok": True, "payload": producer(handler.server.repo_root)})
    except (FileNotFoundError, OSError, UnicodeError, ValueError) as exc:
        handler._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
    return True


def handle_post(handler: Any, route: str) -> bool:
    if route not in MUTATING_ROUTES:
        return False
    try:
        body = handler._read_json_body_strict()
        if route.endswith("i18n-value"):
            payload = update_i18n_value(
                handler.server.repo_root, locale=str(body.get("locale") or ""), key=str(body.get("key") or ""),
                value=str(body.get("value") or ""), revision=str(body.get("revision") or ""),
            )
        else:
            payload = update_theme_value(
                handler.server.repo_root, selector=str(body.get("selector") or ""), name=str(body.get("name") or ""),
                value=str(body.get("value") or ""), revision=str(body.get("revision") or ""),
            )
        handler._send_json({"ok": True, "payload": payload})
    except json.JSONDecodeError:
        handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
    except (FileNotFoundError, OSError, UnicodeError, ValueError) as exc:
        handler._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
    return True
