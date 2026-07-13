from __future__ import annotations

import json
from pathlib import Path

from logics_manager.cli import main
from logics_manager.i18n import i18n_init_payload, i18n_plan_payload, i18n_validate_payload
from logics_manager.viewer_project_tools import detect_project_tools


REPO_ROOT = Path(__file__).resolve().parents[2]


def _repo(tmp_path: Path) -> Path:
    (tmp_path / "logics").mkdir()
    return tmp_path


def _write_contract(root: Path, *, locales: list[str] | None = None) -> None:
    locales = locales or ["en", "fr"]
    target = root / "logics/i18n/contract.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({
        "schema_version": "1.0",
        "applicability": "applicable",
        "source_locale": "en",
        "default_locale": "en",
        "fallback_locale": "en",
        "locales": locales,
        "catalog": {"path": "src/i18n/{locale}.json"},
    }), encoding="utf-8")


def test_schema_declares_optional_and_applicable_contracts() -> None:
    schema = json.loads((REPO_ROOT / "logics/i18n/i18n-contract.v1.schema.json").read_text(encoding="utf-8"))
    assert schema["properties"]["schema_version"]["const"] == "1.0"
    assert schema["properties"]["applicability"]["enum"] == ["applicable", "not_applicable"]
    assert "{locale" in schema["properties"]["catalog"]["properties"]["path"]["pattern"]


def test_absent_contract_is_advisory_and_plannable(tmp_path: Path) -> None:
    root = _repo(tmp_path)
    status = i18n_validate_payload(root)
    assert status["ok"] is True
    assert status["state"] == "absent"
    assert i18n_plan_payload(root)["actions"]


def test_init_creates_smallest_valid_source_only_contract(tmp_path: Path) -> None:
    root = _repo(tmp_path)
    dry_run = i18n_init_payload(
        root, source_locale="fr", catalog_pattern="src/i18n/{locale}.json",
        not_applicable=False, reason=None, dry_run=True,
    )
    assert dry_run["written"] is False
    assert not (root / "logics/i18n/contract.json").exists()

    created = i18n_init_payload(
        root, source_locale="fr", catalog_pattern="src/i18n/{locale}.json",
        not_applicable=False, reason=None, dry_run=False,
    )
    assert created["written"] is True
    assert i18n_validate_payload(root)["state"] == "valid"
    assert i18n_init_payload(
        root, source_locale="fr", catalog_pattern="src/i18n/{locale}.json",
        not_applicable=False, reason=None, dry_run=False,
    )["ok"] is False


def test_validate_reports_catalog_parity_values_keys_and_placeholders(tmp_path: Path) -> None:
    root = _repo(tmp_path)
    _write_contract(root)
    catalog = root / "src/i18n"
    catalog.mkdir(parents=True)
    (catalog / "en.json").write_text(json.dumps({"common": {"hello": "Hello {name}", "save": "Save"}}), encoding="utf-8")
    (catalog / "fr.json").write_text(json.dumps({"common": {"hello": "Bonjour {user}", "bad key": "", "count": 1}}), encoding="utf-8")

    payload = i18n_validate_payload(root)
    codes = {finding["code"] for finding in payload["findings"]}
    assert payload["ok"] is False
    assert {"invalid_key", "empty_value", "non_string_value", "missing_key", "extra_key", "placeholder_mismatch"} <= codes


def test_not_applicable_contract_is_valid(tmp_path: Path) -> None:
    root = _repo(tmp_path)
    target = root / "logics/i18n/contract.json"
    target.parent.mkdir(parents=True)
    target.write_text(json.dumps({
        "schema_version": "1.0", "applicability": "not_applicable", "reason": "No user-facing copy."
    }), encoding="utf-8")
    assert i18n_validate_payload(root)["state"] == "not_applicable"


def test_cli_supports_json_status_and_init(tmp_path: Path, monkeypatch, capsys) -> None:
    root = _repo(tmp_path)
    monkeypatch.chdir(root)
    assert main(["i18n", "status", "--format", "json"]) == 0
    assert json.loads(capsys.readouterr().out)["state"] == "absent"
    assert main(["i18n", "init", "--source-locale", "en", "--format", "json"]) == 0
    assert json.loads(capsys.readouterr().out)["written"] is True
    assert main(["i18n", "validate", "--format", "json"]) == 0
    assert json.loads(capsys.readouterr().out)["state"] == "valid"


def test_viewer_prefers_valid_contract_and_fails_closed_when_invalid(tmp_path: Path) -> None:
    root = _repo(tmp_path)
    _write_contract(root)
    catalog = root / "src/i18n"
    catalog.mkdir(parents=True)
    for locale, value in (("en", "Save"), ("fr", "Enregistrer")):
        (catalog / f"{locale}.json").write_text(json.dumps({"common": {"save": value}}), encoding="utf-8")

    capability = detect_project_tools(root)["i18n"]
    assert capability["state"] == "ready"
    assert capability["detail"]["sourceLocale"] == "en"
    assert capability["detail"]["contract"] == "logics/i18n/contract.json"

    (catalog / "fr.json").write_text(json.dumps({"common": {"bad key": "Enregistrer"}}), encoding="utf-8")
    invalid = detect_project_tools(root)["i18n"]
    assert invalid["state"] == "error"
    assert invalid["available"] is False
