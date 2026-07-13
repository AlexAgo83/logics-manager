from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from .cli_output import render_payload
from .config import find_repo_root


CONTRACT_PATH = Path("logics/i18n/contract.json")
LOCALE_RE = re.compile(r"^[a-z]{2,3}(?:-[A-Z]{2})?$")
KEY_SEGMENT_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_-]*$")
PLACEHOLDER_RE = re.compile(r"\{([A-Za-z][A-Za-z0-9_]*)\}")


def _finding(code: str, message: str, **context: Any) -> dict[str, Any]:
    return {"code": code, "message": message, **context}


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _inside(root: Path, relative: str) -> Path:
    path = (root / relative).resolve()
    if path != root.resolve() and root.resolve() not in path.parents:
        raise ValueError("path escapes the repository")
    return path


def _flatten(value: Any, prefix: str = "") -> tuple[dict[str, str], list[dict[str, Any]]]:
    strings: dict[str, str] = {}
    findings: list[dict[str, Any]] = []
    if not isinstance(value, dict):
        return strings, [_finding("catalog_not_object", "Catalog root must be a JSON object.")]
    for raw_key, child in value.items():
        key = str(raw_key)
        dotted = f"{prefix}.{key}" if prefix else key
        if not KEY_SEGMENT_RE.fullmatch(key):
            findings.append(_finding("invalid_key", f"Invalid semantic key segment: {key}", key=dotted))
        if isinstance(child, dict):
            nested, nested_findings = _flatten(child, dotted)
            strings.update(nested)
            findings.extend(nested_findings)
        elif isinstance(child, str):
            strings[dotted] = child
            if not child.strip():
                findings.append(_finding("empty_value", f"Translation value is empty: {dotted}", key=dotted))
        else:
            findings.append(_finding("non_string_value", f"Translation value must be a string: {dotted}", key=dotted))
    return strings, findings


def _contract_shape(contract: Any) -> list[dict[str, Any]]:
    if not isinstance(contract, dict):
        return [_finding("invalid_contract", "Contract root must be a JSON object.")]
    allowed = {
        "$schema", "schema_version", "applicability", "reason", "source_locale",
        "default_locale", "fallback_locale", "locales", "catalog",
    }
    findings = [
        _finding("unknown_field", f"Unknown contract field: {key}", field=key)
        for key in contract if key not in allowed
    ]
    if contract.get("schema_version") != "1.0":
        findings.append(_finding("schema_version", "schema_version must be '1.0'."))
    applicability = contract.get("applicability")
    if applicability not in {"applicable", "not_applicable"}:
        findings.append(_finding("applicability", "applicability must be 'applicable' or 'not_applicable'."))
        return findings
    if applicability == "not_applicable":
        if not isinstance(contract.get("reason"), str) or not contract["reason"].strip():
            findings.append(_finding("reason", "A not-applicable contract requires a non-empty reason."))
        return findings
    locales = contract.get("locales")
    if not isinstance(locales, list) or not locales or any(not isinstance(locale, str) or not LOCALE_RE.fullmatch(locale) for locale in locales):
        findings.append(_finding("locales", "locales must be a non-empty list of locale identifiers."))
        locales = []
    elif len(locales) != len(set(locales)):
        findings.append(_finding("duplicate_locale", "locales must not contain duplicates."))
    for field in ("source_locale", "default_locale", "fallback_locale"):
        locale = contract.get(field)
        if not isinstance(locale, str) or locale not in locales:
            findings.append(_finding(field, f"{field} must reference a declared locale."))
    catalog = contract.get("catalog")
    if not isinstance(catalog, dict) or set(catalog) != {"path"} or not isinstance(catalog.get("path"), str):
        findings.append(_finding("catalog", "catalog must contain only a string path."))
    elif "{locale}" not in catalog["path"]:
        findings.append(_finding("catalog_pattern", "catalog.path must contain {locale}."))
    elif Path(catalog["path"]).is_absolute():
        findings.append(_finding("catalog_path", "catalog.path must be repository-relative."))
    return findings


def i18n_validate_payload(repo_root: Path) -> dict[str, Any]:
    contract_file = repo_root / CONTRACT_PATH
    if not contract_file.is_file():
        return {
            "ok": True, "configured": False, "state": "absent", "applicable": None,
            "contract_path": CONTRACT_PATH.as_posix(), "findings": [],
            "next_action": "Run logics-manager i18n init --source-locale <locale> for a project that owns user-facing copy.",
        }
    try:
        contract = _read_json(contract_file)
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        return {
            "ok": False, "configured": True, "state": "invalid", "applicable": None,
            "contract_path": CONTRACT_PATH.as_posix(),
            "findings": [_finding("invalid_json", f"Unable to read contract JSON: {exc}")],
            "next_action": "Fix the contract JSON and rerun logics-manager i18n validate.",
        }
    findings = _contract_shape(contract)
    applicable = isinstance(contract, dict) and contract.get("applicability") == "applicable"
    catalogs: dict[str, dict[str, str]] = {}
    if applicable and not findings:
        pattern = contract["catalog"]["path"]
        for locale in contract["locales"]:
            relative = pattern.replace("{locale}", locale)
            try:
                path = _inside(repo_root, relative)
            except ValueError:
                findings.append(_finding("catalog_path", f"Catalog path escapes the repository: {relative}", locale=locale))
                continue
            if not path.is_file():
                findings.append(_finding("missing_catalog", f"Missing catalog: {relative}", locale=locale, path=relative))
                continue
            try:
                value = _read_json(path)
            except (OSError, UnicodeError, json.JSONDecodeError) as exc:
                findings.append(_finding("invalid_catalog", f"Unable to read {relative}: {exc}", locale=locale, path=relative))
                continue
            flattened, catalog_findings = _flatten(value)
            for finding in catalog_findings:
                finding.setdefault("locale", locale)
                finding.setdefault("path", relative)
            findings.extend(catalog_findings)
            catalogs[locale] = flattened
        source = contract["source_locale"]
        if source in catalogs:
            source_keys = set(catalogs[source])
            for locale, values in catalogs.items():
                missing = sorted(source_keys - set(values))
                extra = sorted(set(values) - source_keys)
                for key in missing:
                    findings.append(_finding("missing_key", f"{locale} is missing key: {key}", locale=locale, key=key))
                for key in extra:
                    findings.append(_finding("extra_key", f"{locale} has extra key: {key}", locale=locale, key=key))
                for key in sorted(source_keys & set(values)):
                    expected = sorted(set(PLACEHOLDER_RE.findall(catalogs[source][key])))
                    actual = sorted(set(PLACEHOLDER_RE.findall(values[key])))
                    if actual != expected:
                        findings.append(_finding(
                            "placeholder_mismatch", f"Placeholder mismatch for {locale}:{key}",
                            locale=locale, key=key, expected=expected, actual=actual,
                        ))
    ok = not findings
    state = "not_applicable" if not applicable and not findings else "valid" if ok else "invalid"
    return {
        "ok": ok, "configured": True, "state": state, "applicable": applicable,
        "contract_path": CONTRACT_PATH.as_posix(), "contract": contract,
        "catalogs": {locale: len(values) for locale, values in catalogs.items()},
        "findings": findings,
        "next_action": "The i18n contract is valid." if ok else "Fix reported findings and rerun logics-manager i18n validate.",
    }


def i18n_status_payload(repo_root: Path) -> dict[str, Any]:
    return i18n_validate_payload(repo_root)


def i18n_plan_payload(repo_root: Path) -> dict[str, Any]:
    status = i18n_validate_payload(repo_root)
    if status["state"] == "absent":
        actions = [
            "Choose the source locale for app-owned user-facing copy.",
            "Run logics-manager i18n init --source-locale <locale>.",
            "Route new UI copy through stable semantic keys.",
        ]
    elif status["state"] == "valid":
        actions = ["Keep catalogs valid with logics-manager i18n validate in the project quality gate."]
    elif status["state"] == "not_applicable":
        actions = ["No i18n work is required while the project owns no user-facing copy."]
    else:
        actions = ["Fix each reported contract or catalog finding.", "Rerun logics-manager i18n validate."]
    return {**status, "actions": actions}


def i18n_init_payload(
    repo_root: Path, *, source_locale: str | None, catalog_pattern: str,
    not_applicable: bool, reason: str | None, dry_run: bool,
) -> dict[str, Any]:
    contract_file = repo_root / CONTRACT_PATH
    if contract_file.exists():
        return {"ok": False, "written": False, "error": f"{CONTRACT_PATH.as_posix()} already exists."}
    if not_applicable:
        if not reason or not reason.strip():
            return {"ok": False, "written": False, "error": "--not-applicable requires --reason."}
        contract: dict[str, Any] = {"schema_version": "1.0", "applicability": "not_applicable", "reason": reason.strip()}
        catalog_file = None
    else:
        if not source_locale or not LOCALE_RE.fullmatch(source_locale):
            return {"ok": False, "written": False, "error": "A valid --source-locale is required."}
        if "{locale}" not in catalog_pattern or Path(catalog_pattern).is_absolute():
            return {"ok": False, "written": False, "error": "--catalog must be a repository-relative path containing {locale}."}
        try:
            catalog_file = _inside(repo_root, catalog_pattern.replace("{locale}", source_locale))
        except ValueError as exc:
            return {"ok": False, "written": False, "error": str(exc)}
        if catalog_file.exists():
            return {"ok": False, "written": False, "error": f"{catalog_file.relative_to(repo_root)} already exists."}
        contract = {
            "schema_version": "1.0", "applicability": "applicable",
            "source_locale": source_locale, "default_locale": source_locale,
            "fallback_locale": source_locale, "locales": [source_locale],
            "catalog": {"path": catalog_pattern},
        }
    paths = [CONTRACT_PATH.as_posix()]
    if catalog_file is not None:
        paths.append(catalog_file.relative_to(repo_root).as_posix())
    if not dry_run:
        contract_file.parent.mkdir(parents=True, exist_ok=True)
        contract_file.write_text(json.dumps(contract, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if catalog_file is not None:
            catalog_file.parent.mkdir(parents=True, exist_ok=True)
            catalog_file.write_text("{}\n", encoding="utf-8")
    return {
        "ok": True, "written": not dry_run, "dry_run": dry_run, "paths": paths,
        "contract": contract,
        "next_action": "Review the proposed files." if dry_run else "Add semantic source-locale keys, then run logics-manager i18n validate.",
    }


def _render(payload: dict[str, Any]) -> str:
    lines = [f"i18n: {payload.get('state', 'initialized')}"]
    if payload.get("contract_path"):
        lines.append(f"Contract: {payload['contract_path']}")
    for finding in payload.get("findings", []):
        lines.append(f"- {finding['code']}: {finding['message']}")
    for action in payload.get("actions", []):
        lines.append(f"- {action}")
    if payload.get("paths"):
        lines.extend(f"- {path}" for path in payload["paths"])
    if payload.get("error"):
        lines.append(f"Error: {payload['error']}")
    if payload.get("next_action"):
        lines.append(f"Next action: {payload['next_action']}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    argv = argv or []
    if argv in (["-h"], ["--help"]):
        print("\n".join([
            "Logics i18n CLI", "Inspect and validate the optional project-owned i18n contract.", "",
            "Usage:", "  logics-manager i18n status [--format text|json]",
            "  logics-manager i18n plan [--format text|json]",
            "  logics-manager i18n lint [--format text|json]",
            "  logics-manager i18n validate [--format text|json]",
            "  logics-manager i18n init --source-locale <locale> [--catalog <pattern>] [--dry-run] [--format text|json]",
            "  logics-manager i18n init --not-applicable --reason <text> [--dry-run] [--format text|json]",
        ]))
        return 0
    parser = argparse.ArgumentParser(prog="logics-manager i18n", add_help=False)
    sub = parser.add_subparsers(dest="command")
    for name in ("status", "plan", "lint", "validate"):
        command = sub.add_parser(name, add_help=False)
        command.add_argument("--format", choices=("text", "json"), default="text")
    init = sub.add_parser("init", add_help=False)
    init.add_argument("--source-locale")
    init.add_argument("--catalog", default="src/i18n/{locale}.json")
    init.add_argument("--not-applicable", action="store_true")
    init.add_argument("--reason")
    init.add_argument("--dry-run", action="store_true")
    init.add_argument("--format", choices=("text", "json"), default="text")
    parsed = parser.parse_args(argv)
    if not parsed.command:
        raise SystemExit("Usage: logics-manager i18n <status|init|plan|lint|validate> [args...]")
    root = find_repo_root(Path.cwd())
    if parsed.command == "init":
        payload = i18n_init_payload(
            root, source_locale=parsed.source_locale, catalog_pattern=parsed.catalog,
            not_applicable=parsed.not_applicable, reason=parsed.reason, dry_run=parsed.dry_run,
        )
    elif parsed.command == "plan":
        payload = i18n_plan_payload(root)
    else:
        payload = i18n_validate_payload(root)
    print(render_payload(payload, parsed.format, lambda: _render(payload)))
    return 0 if payload.get("ok") else 1
