from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from logics_manager.cli import main
from logics_manager.release import (
    release_add_evidence_payload,
    release_context_pack_payload,
    release_discover_payload,
    release_plan_payload,
    release_reset_payload,
    release_status_payload,
    release_validate_payload,
)
from logics_manager.sync import build_context_pack_payload


REPO_ROOT = Path(__file__).resolve().parents[2]
RELEASE_ROOT = REPO_ROOT / "logics" / "release"
EXPECTED_STATES = [
    "planning",
    "preparing",
    "local_validation",
    "commit_ready",
    "pushed",
    "ci_verification",
    "github_release",
    "external_publication",
    "ready",
    "blocked",
]
EVIDENCE_KINDS = {"command", "file", "git", "ci", "github_release", "external"}


def _load_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def test_release_contract_schema_declares_required_release_surfaces() -> None:
    schema = _load_json(RELEASE_ROOT / "release-contract.v1.schema.json")

    assert schema["$schema"] == "https://json-schema.org/draft/2020-12/schema"
    assert schema["properties"]["schema_version"]["const"] == "1.0"
    assert set(schema["required"]) >= {
        "version_sources",
        "changelog",
        "state_machine",
        "gates",
        "evidence",
        "git",
        "github_release",
        "assistant_readiness",
    }
    assert schema["$defs"]["release_state"]["enum"] == EXPECTED_STATES
    assert set(schema["$defs"]["evidence_kind"]["enum"]) == EVIDENCE_KINDS


def test_release_fixture_profiles_match_contract_invariants() -> None:
    fixture_paths = sorted((RELEASE_ROOT / "fixtures").glob("*.release.json"))
    assert {path.name for path in fixture_paths} == {
        "cdx-manager.release.json",
        "cp-wc-26.release.json",
        "logics-manager.release.json",
    }

    for path in fixture_paths:
        contract = _load_json(path)
        gate_ids = {gate["id"] for gate in contract["gates"]}
        required_gates = {gate["id"] for gate in contract["gates"] if gate["required"]}

        assert contract["schema_version"] == "1.0"
        assert contract["state_machine"] == EXPECTED_STATES
        assert contract["version_sources"]
        assert contract["changelog"]["paths"]
        assert contract["evidence"]["freshness"]["match_target_version"] is True
        assert contract["evidence"]["freshness"]["match_commit_for_source_gates"] is True
        assert contract["assistant_readiness"]["must_inspect_status_before_claiming_ready"] is True
        assert contract["assistant_readiness"]["readiness_source"] == "project_owned_evidence"
        assert {"version_metadata", "changelog", "local_validation", "git_push", "ci"} <= gate_ids
        assert {"version_metadata", "changelog", "local_validation", "git_push", "ci"} <= required_gates

        for gate in contract["gates"]:
            assert gate["state"] in EXPECTED_STATES
            assert set(gate["evidence_kinds"]) <= EVIDENCE_KINDS

        for command in contract.get("validation_commands", []):
            assert command["id"]
            assert command["command"]
            assert command["evidence_kind"] == "command"


def _write_release_repo(tmp_path: Path, evidence: list[dict[str, object]], *, version: str = "1.2.3") -> Path:
    repo_root = tmp_path / "repo"
    release_dir = repo_root / "logics" / "release"
    release_dir.mkdir(parents=True)
    (repo_root / "package.json").write_text(json.dumps({"version": version}), encoding="utf-8")
    (repo_root / "README.md").write_text(f"![Version](https://img.shields.io/badge/version-v{version}-4C8BF5)\n", encoding="utf-8")
    (repo_root / "CHANGELOG.md").write_text(f"## {version}\n\n- Release note.\n", encoding="utf-8")
    contract = {
        "schema_version": "1.0",
        "project": {"id": "demo", "display_name": "Demo"},
        "version_sources": [
            {"path": "package.json", "format": "json", "selector": "version", "required": True},
            {"path": "README.md", "format": "plain_text", "selector": "badge.version", "required": True},
        ],
        "changelog": {"required": True, "paths": [{"path": "CHANGELOG.md", "format": "markdown", "required": True}]},
        "state_machine": EXPECTED_STATES,
        "gates": [
            {"id": "version_metadata", "state": "preparing", "required": True, "evidence_kinds": ["file"]},
            {"id": "local_validation", "state": "local_validation", "required": True, "evidence_kinds": ["command"]},
            {"id": "github_release", "state": "github_release", "required": True, "evidence_kinds": ["github_release"]},
        ],
        "evidence": {
            "store": {"path": "logics/release/evidence.jsonl", "format": "jsonl", "required": True},
            "freshness": {
                "match_target_version": True,
                "match_commit_for_source_gates": True,
                "match_tag_for_publication_gates": True,
            },
        },
        "validation_commands": [{"id": "test", "command": ["npm", "test"], "required": True, "evidence_kind": "command"}],
        "git": {
            "release_branch_policy": "current_branch",
            "tag_policy": {"required": True, "pattern": "v{version}"},
            "require_clean_worktree": False,
            "require_pushed_commit": False,
        },
        "github_release": {"required": True, "mode": "manual"},
        "assistant_readiness": {
            "must_inspect_status_before_claiming_ready": True,
            "readiness_source": "project_owned_evidence",
        },
    }
    (release_dir / "contract.json").write_text(json.dumps(contract, indent=2), encoding="utf-8")
    subprocess.run(["git", "init"], cwd=repo_root, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo_root, check=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=repo_root, check=True)
    subprocess.run(["git", "add", "."], cwd=repo_root, check=True)
    subprocess.run(["git", "commit", "-m", "initial"], cwd=repo_root, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=repo_root, check=True, stdout=subprocess.PIPE, text=True).stdout.strip()
    normalized = []
    for entry in evidence:
        normalized.append({key: (commit if value == "{commit}" else value) for key, value in entry.items()})
    (release_dir / "evidence.jsonl").write_text("\n".join(json.dumps(entry) for entry in normalized) + "\n", encoding="utf-8")
    return repo_root


def _passing_evidence() -> list[dict[str, object]]:
    return [
        {"gate_id": "version_metadata", "kind": "file", "status": "passed", "observed_at": "2026-06-18T10:00:00Z", "target_version": "1.2.3", "commit": "{commit}", "summary": "version files updated"},
        {"gate_id": "local_validation", "kind": "command", "status": "passed", "observed_at": "2026-06-18T10:01:00Z", "target_version": "1.2.3", "commit": "{commit}", "summary": "tests passed"},
        {"gate_id": "github_release", "kind": "github_release", "status": "passed", "observed_at": "2026-06-18T10:02:00Z", "target_version": "1.2.3", "tag": "v1.2.3", "summary": "release published"},
    ]


def test_release_status_and_validate_pass_with_matching_evidence(tmp_path: Path) -> None:
    repo_root = _write_release_repo(tmp_path, _passing_evidence())

    status = release_status_payload(repo_root)
    validation = release_validate_payload(repo_root, "1.2.3")

    assert status["configured"] is True
    assert status["state"] == "ready"
    assert status["ok"] is True
    assert validation["ok"] is True
    assert {check["status"] for check in validation["checks"]} == {"passed"}


def test_release_reset_clears_evidence_and_returns_gates_to_pending(tmp_path: Path) -> None:
    repo_root = _write_release_repo(tmp_path, _passing_evidence())
    evidence_path = repo_root / "logics" / "release" / "evidence.jsonl"
    assert evidence_path.is_file()
    assert release_status_payload(repo_root)["state"] == "ready"

    result = release_reset_payload(repo_root)

    assert result["ok"] is True
    assert result["reset"] is True
    assert result["cleared"] == len(_passing_evidence())
    assert not evidence_path.exists()
    # Every gate returns to pending once the evidence store is gone.
    status = release_status_payload(repo_root)
    assert status["state"] != "ready"
    assert all(gate.get("status") == "pending" for gate in status["gates"])


def test_release_reset_is_idempotent_when_no_evidence(tmp_path: Path) -> None:
    repo_root = _write_release_repo(tmp_path, [])
    evidence_path = repo_root / "logics" / "release" / "evidence.jsonl"
    if evidence_path.exists():
        evidence_path.unlink()

    result = release_reset_payload(repo_root)

    assert result["ok"] is True
    assert result["reset"] is True
    assert result["cleared"] == 0


def test_release_reset_reports_missing_config(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()

    result = release_reset_payload(repo_root)

    assert result["configured"] is False
    assert result["reset"] is False


def test_release_plan_is_non_mutating_and_lists_expected_steps(tmp_path: Path) -> None:
    repo_root = _write_release_repo(tmp_path, _passing_evidence())

    plan = release_plan_payload(repo_root, "1.2.4")

    assert plan["ok"] is True
    assert plan["target_version"] == "1.2.4"
    assert [step["kind"] for step in plan["steps"]] == [
        "version_source",
        "version_source",
        "changelog",
        "validation_command",
        "git",
        "github_release",
    ]
    assert plan["publication_requires_explicit_operator_action"] is True
    assert [step["kind"] for step in plan["steps"] if step.get("publication_action")] == ["github_release"]


def test_release_context_pack_projection_contains_agent_guidance(tmp_path: Path) -> None:
    repo_root = _write_release_repo(tmp_path, _passing_evidence())

    context = release_context_pack_payload(repo_root)

    assert context["configured"] is True
    assert context["target_version"] == "1.2.3"
    assert context["state"] == "ready"
    assert [gate["id"] for gate in context["required_gates"]] == ["version_metadata", "local_validation", "github_release"]
    assert "Release readiness must come from project-owned evidence, not conversational memory." in context["guidance"]
    assert "logics-manager release validate <version>" in context["safe_actions"]
    assert "GitHub release publication" in context["publication_actions"]


def test_sync_context_pack_includes_release_context_for_any_project(tmp_path: Path) -> None:
    repo_root = _write_release_repo(tmp_path, _passing_evidence())
    request_dir = repo_root / "logics" / "request"
    request_dir.mkdir(parents=True)
    (request_dir / "req_001_demo.md").write_text(
        "\n".join(
            [
                "## req_001_demo - Demo Request",
                "> Status: Ready",
                "> Schema version: 1.0",
                "# Needs",
                "- Release-aware context.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    pack = build_context_pack_payload(repo_root, "req_001_demo", profile="tiny")

    assert pack["release"]["configured"] is True
    assert pack["release"]["target_version"] == "1.2.3"
    assert pack["release"]["state"] == "ready"
    assert [gate["id"] for gate in pack["release"]["required_gates"]] == ["version_metadata", "local_validation", "github_release"]
    assert "Release readiness must come from project-owned evidence, not conversational memory." in pack["release"]["guidance"]


def test_release_status_reports_missing_config(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    (repo_root / "logics").mkdir(parents=True)

    status = release_status_payload(repo_root)

    assert status["configured"] is False
    assert status["state"] == "not_configured"
    assert status["blocking_reasons"] == ["Missing logics/release/contract.json."]


def test_release_discover_infers_draft_from_local_sources(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    workflows = repo_root / ".github" / "workflows"
    workflows.mkdir(parents=True)
    (repo_root / "logics" / "release").mkdir(parents=True)
    (repo_root / "package.json").write_text(
        json.dumps({"name": "@example/demo-app", "version": "1.2.3", "scripts": {"ci:check": "node scripts/ci-check.mjs", "test": "vitest run"}}),
        encoding="utf-8",
    )
    (repo_root / "VERSION").write_text("1.2.3\n", encoding="utf-8")
    (repo_root / "changelogs").mkdir()
    (workflows / "release.yml").write_text("name: Release\n", encoding="utf-8")
    (workflows / "publish-npm.yml").write_text("name: Publish npm\n", encoding="utf-8")

    payload = release_discover_payload(repo_root)

    assert payload["configured"] is False
    assert payload["draft_written"] is False
    assert payload["draft"]["project"]["id"] == "demo-app"
    assert payload["draft"]["changelog"]["paths"][0]["path"] == "changelogs/CHANGELOGS_{version_underscore}.md"
    assert [command["id"] for command in payload["draft"]["validation_commands"]] == ["ci_check", "test"]
    github_gate = next(gate for gate in payload["draft"]["gates"] if gate["id"] == "github_release")
    npm_gate = next(gate for gate in payload["draft"]["gates"] if gate["id"] == "npm_package")
    assert github_gate["required"] is True
    assert npm_gate["required"] is True
    assert payload["draft"]["missing_contract_discovery"]["local_first"] is True
    assert payload["draft"]["operator_intents"][0]["publication_action"] is False


def test_release_discover_write_creates_draft_contract(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    (repo_root / "logics" / "release").mkdir(parents=True)
    (repo_root / "pyproject.toml").write_text('[project]\nname = "demo-py"\nversion = "0.1.0"\n', encoding="utf-8")
    (repo_root / "CHANGELOG.md").write_text("# Changelog\n", encoding="utf-8")

    payload = release_discover_payload(repo_root, write=True)

    draft_path = repo_root / "logics" / "release" / "contract.draft.json"
    draft = json.loads(draft_path.read_text(encoding="utf-8"))
    assert payload["draft_written"] is True
    assert payload["draft_path"] == "logics/release/contract.draft.json"
    assert draft["project"]["id"] == "demo-py"
    assert draft["version_sources"] == [{"path": "pyproject.toml", "format": "toml", "selector": "project.version", "required": True}]


def test_release_discover_keeps_existing_contract_unmodified(tmp_path: Path) -> None:
    repo_root = _write_release_repo(tmp_path, [])

    payload = release_discover_payload(repo_root, write=True)

    assert payload["configured"] is True
    assert payload["draft_written"] is False
    assert not (repo_root / "logics" / "release" / "contract.draft.json").exists()


def test_release_status_blocks_failed_command_evidence(tmp_path: Path) -> None:
    evidence = _passing_evidence()
    evidence[1] = {**evidence[1], "status": "failed", "summary": "npm test failed"}
    repo_root = _write_release_repo(tmp_path, evidence)

    status = release_status_payload(repo_root)

    assert status["state"] == "blocked"
    failed_gate = next(gate for gate in status["gates"] if gate["id"] == "local_validation")
    assert failed_gate["status"] == "failed"
    assert failed_gate["blocking_reason"] == "npm test failed"


def test_release_status_blocks_stale_version_and_wrong_commit_or_tag(tmp_path: Path) -> None:
    evidence = _passing_evidence()
    evidence[0] = {**evidence[0], "target_version": "9.9.9"}
    evidence[1] = {**evidence[1], "commit": "deadbeef"}
    evidence[2] = {**evidence[2], "tag": "v9.9.9"}
    repo_root = _write_release_repo(tmp_path, evidence)

    status = release_status_payload(repo_root)
    gates = {gate["id"]: gate for gate in status["gates"]}

    assert status["state"] == "blocked"
    assert gates["version_metadata"]["status"] == "stale"
    assert gates["local_validation"]["status"] == "stale"
    assert gates["github_release"]["status"] == "stale"


def test_release_status_blocks_ci_evidence_from_wrong_commit(tmp_path: Path) -> None:
    repo_root = _write_release_repo(tmp_path, _passing_evidence())
    contract_path = repo_root / "logics" / "release" / "contract.json"
    contract = _load_json(contract_path)
    contract["gates"].append({"id": "ci", "state": "ci_verification", "required": True, "evidence_kinds": ["ci"]})
    contract_path.write_text(json.dumps(contract, indent=2), encoding="utf-8")
    evidence_path = repo_root / "logics" / "release" / "evidence.jsonl"
    with evidence_path.open("a", encoding="utf-8") as handle:
        handle.write(
            json.dumps(
                {
                    "gate_id": "ci",
                    "kind": "ci",
                    "status": "passed",
                    "observed_at": "2026-06-18T10:03:00Z",
                    "target_version": "1.2.3",
                    "commit": "deadbeef",
                    "summary": "CI passed on an old commit",
                }
            )
            + "\n"
        )

    status = release_status_payload(repo_root)
    ci_gate = next(gate for gate in status["gates"] if gate["id"] == "ci")

    assert ci_gate["status"] == "stale"
    assert ci_gate["blocking_reason"] == "evidence targets a different commit"


def test_release_cli_status_returns_stable_json(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = _write_release_repo(tmp_path, _passing_evidence())
    monkeypatch.setattr("logics_manager.release.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["release", "status", "--format", "json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["state"] == "ready"
    assert payload["configured"] is True
    assert [gate["id"] for gate in payload["gates"]] == ["version_metadata", "local_validation", "github_release"]


def test_release_status_reads_readme_badge_version_source(tmp_path: Path) -> None:
    repo_root = _write_release_repo(tmp_path, _passing_evidence())

    status = release_status_payload(repo_root)

    readme_source = next(source for source in status["version_sources"] if source["path"] == "README.md")
    assert readme_source["ok"] is True
    assert readme_source["version"] == "1.2.3"


def test_release_add_evidence_appends_jsonl_and_updates_gate(tmp_path: Path) -> None:
    repo_root = _write_release_repo(tmp_path, [])
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=repo_root, check=True, stdout=subprocess.PIPE, text=True).stdout.strip()

    payload = release_add_evidence_payload(
        repo_root,
        gate_id="local_validation",
        kind="command",
        status="passed",
        summary="npm test passed",
        command="npm test",
    )

    evidence_path = repo_root / "logics" / "release" / "evidence.jsonl"
    entries = [json.loads(line) for line in evidence_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert payload["ok"] is True
    assert payload["entry"]["target_version"] == "1.2.3"
    assert payload["entry"]["commit"] == commit
    assert entries[-1]["gate_id"] == "local_validation"
    assert entries[-1]["command"] == "npm test"
    status = release_status_payload(repo_root)
    local_gate = next(gate for gate in status["gates"] if gate["id"] == "local_validation")
    assert local_gate["status"] == "passed"


def test_release_cli_evidence_add_returns_stable_json(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = _write_release_repo(tmp_path, [])
    monkeypatch.setattr("logics_manager.release.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(
        [
            "release",
            "evidence",
            "add",
            "github_release",
            "--kind",
            "github_release",
            "--status",
            "passed",
            "--summary",
            "GitHub release published",
            "--format",
            "json",
        ]
    )

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["recorded"] is True
    assert payload["entry"]["gate_id"] == "github_release"
    assert payload["entry"]["tag"] == "v1.2.3"
