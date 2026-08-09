from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from logics_manager.cli import main
from logics_manager.release import (
    load_release_context,
    release_add_evidence_payload,
    release_context_pack_payload,
    release_discover_payload,
    release_plan_payload,
    release_reset_payload,
    release_status_payload,
    release_validate_payload,
)
from logics_manager.release import _current_version, _version_source_blocking_reasons
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


def _write_release_repo(
    tmp_path: Path,
    evidence: list[dict[str, object]],
    *,
    version: str = "1.2.3",
    gates: list[dict[str, object]] | None = None,
) -> Path:
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
        "gates": gates
        if gates is not None
        else [
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


def test_release_evidence_add_help_exits_cleanly(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main(["release", "evidence", "add", "--help"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Usage: logics-manager release evidence add" in captured.out
    assert "Example:" in captured.out


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


def test_release_status_blocks_missing_evidence_provenance(tmp_path: Path) -> None:
    evidence = _passing_evidence()
    evidence[0] = {key: value for key, value in evidence[0].items() if key not in {"target_version", "commit"}}
    evidence[1] = {key: value for key, value in evidence[1].items() if key != "commit"}
    evidence[2] = {key: value for key, value in evidence[2].items() if key != "tag"}
    repo_root = _write_release_repo(tmp_path, evidence)

    status = release_status_payload(repo_root)
    gates = {gate["id"]: gate for gate in status["gates"]}

    assert status["state"] == "blocked"
    assert gates["version_metadata"]["status"] == "stale"
    assert gates["version_metadata"]["blocking_reason"] == "evidence target version is missing"
    assert gates["local_validation"]["status"] == "stale"
    assert gates["local_validation"]["blocking_reason"] == "evidence commit is missing (release)"
    assert gates["github_release"]["status"] == "stale"
    assert gates["github_release"]["blocking_reason"] == "evidence tag is missing"


def test_release_status_blocks_disagreeing_version_sources(tmp_path: Path) -> None:
    repo_root = _write_release_repo(tmp_path, _passing_evidence())
    (repo_root / "README.md").write_text("![Version](https://img.shields.io/badge/version-v9.9.9-4C8BF5)\n", encoding="utf-8")

    status = release_status_payload(repo_root)

    assert status["state"] == "blocked"
    assert status["target_version"] is None
    assert status["blocking_reasons"][0] == "version_metadata: version sources disagree (1.2.3, 9.9.9)"


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
    assert ci_gate["comparison"] == "release"
    assert ci_gate["blocking_reason"] == "evidence targets a different commit (release)"


_COMPARISON_GATES = [
    {"id": "ci", "state": "ci_verification", "required": True, "evidence_kinds": ["ci"]},
    {
        "id": "git_push",
        "state": "pushed",
        "required": True,
        "evidence_kinds": ["git"],
        "comparison": "branch",
        "comparison_reason": "A push claim describes this branch's HEAD, not the tagged release commit.",
    },
]


def test_release_status_stays_valid_at_tagged_commit_after_later_commits_land(tmp_path: Path) -> None:
    """item_647 AC1/AC2/AC5: a release-judged gate's evidence, recorded at the tag, survives commits that land after it."""
    repo_root = _write_release_repo(tmp_path, [], gates=_COMPARISON_GATES)
    tagged_commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=repo_root, check=True, stdout=subprocess.PIPE, text=True).stdout.strip()
    subprocess.run(["git", "tag", "v1.2.3"], cwd=repo_root, check=True)

    evidence_path = repo_root / "logics" / "release" / "evidence.jsonl"
    evidence_path.write_text(
        json.dumps(
            {
                "gate_id": "ci",
                "kind": "ci",
                "status": "passed",
                "observed_at": "2026-06-18T10:03:00Z",
                "target_version": "1.2.3",
                "commit": tagged_commit,
                "summary": "CI passed for the tagged commit",
            }
        )
        + "\n",
        encoding="utf-8",
    )

    # AC2: no later commits yet, no tag drift - still resolves via the tag and passes.
    status = release_status_payload(repo_root)
    ci_gate = next(gate for gate in status["gates"] if gate["id"] == "ci")
    assert ci_gate["comparison"] == "release"
    assert ci_gate["status"] == "passed"
    assert status["release_commit"] == tagged_commit

    # AC1/AC5: a checksum write-back or closeout commit lands on the branch after the tag.
    (repo_root / "post-release.txt").write_text("closeout\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo_root, check=True)
    subprocess.run(["git", "commit", "-m", "post-release closeout"], cwd=repo_root, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    status = release_status_payload(repo_root)
    ci_gate = next(gate for gate in status["gates"] if gate["id"] == "ci")
    assert ci_gate["status"] == "passed", "release-judged evidence must not go stale when later commits land"
    assert status["release_commit"] == tagged_commit
    assert status["commit"] != tagged_commit


def test_release_status_no_tag_falls_back_to_working_commit(tmp_path: Path) -> None:
    """item_647 AC2: a release in preparation with no tag yet validates against the working commit."""
    repo_root = _write_release_repo(tmp_path, [], gates=_COMPARISON_GATES)
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=repo_root, check=True, stdout=subprocess.PIPE, text=True).stdout.strip()

    evidence_path = repo_root / "logics" / "release" / "evidence.jsonl"
    evidence_path.write_text(
        json.dumps(
            {
                "gate_id": "ci",
                "kind": "ci",
                "status": "passed",
                "observed_at": "2026-06-18T10:03:00Z",
                "target_version": "1.2.3",
                "commit": commit,
                "summary": "CI passed",
            }
        )
        + "\n",
        encoding="utf-8",
    )

    status = release_status_payload(repo_root)

    assert status["release_commit"] == commit
    assert next(gate for gate in status["gates"] if gate["id"] == "ci")["status"] == "passed"


def test_release_status_reports_comparison_and_names_it_in_branch_judged_gate(tmp_path: Path) -> None:
    """item_648 AC1/AC2/AC3/AC5: gates declare their comparison, and a branch-judged gate goes stale as the branch advances even though a release-judged gate stays put."""
    repo_root = _write_release_repo(tmp_path, [], gates=_COMPARISON_GATES)
    pushed_commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=repo_root, check=True, stdout=subprocess.PIPE, text=True).stdout.strip()
    subprocess.run(["git", "tag", "v1.2.3"], cwd=repo_root, check=True)

    evidence_path = repo_root / "logics" / "release" / "evidence.jsonl"
    evidence_path.write_text(
        "\n".join(
            json.dumps(entry)
            for entry in [
                {
                    "gate_id": "ci",
                    "kind": "ci",
                    "status": "passed",
                    "observed_at": "2026-06-18T10:03:00Z",
                    "target_version": "1.2.3",
                    "commit": pushed_commit,
                    "summary": "CI passed",
                },
                {
                    "gate_id": "git_push",
                    "kind": "git",
                    "status": "passed",
                    "observed_at": "2026-06-18T10:04:00Z",
                    "target_version": "1.2.3",
                    "commit": pushed_commit,
                    "summary": "pushed to main",
                },
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    # A further commit lands on the branch (e.g. release closeout) without re-recording git_push evidence.
    (repo_root / "post-release.txt").write_text("closeout\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo_root, check=True)
    subprocess.run(["git", "commit", "-m", "post-release closeout"], cwd=repo_root, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    status = release_status_payload(repo_root)
    gates = {gate["id"]: gate for gate in status["gates"]}

    assert gates["ci"]["comparison"] == "release"
    assert gates["ci"]["status"] == "passed"
    assert gates["git_push"]["comparison"] == "branch"
    assert gates["git_push"]["status"] == "stale"
    assert gates["git_push"]["blocking_reason"] == "evidence targets a different commit (branch)"


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


def test_bounded_repo_path_rejects_escapes(tmp_path: Path) -> None:
    from logics_manager.release import _bounded_repo_path

    (tmp_path / "logics" / "release").mkdir(parents=True)
    inside = tmp_path / "logics" / "release" / "evidence.jsonl"
    inside.write_text("{}\n", encoding="utf-8")

    assert _bounded_repo_path(tmp_path, "logics/release/evidence.jsonl") == inside.resolve()
    assert _bounded_repo_path(tmp_path, "../../etc/passwd") is None
    assert _bounded_repo_path(tmp_path, "/etc/passwd") is None


def test_release_discover_picks_up_the_claude_plugin_manifest_as_a_version_source(tmp_path: Path) -> None:
    """req_318/item_654: plugin.json's version must be verified against VERSION
    by the same release-gate machinery that already checks package.json and
    pyproject.toml, rather than drifting unnoticed as a second hardcoded copy."""
    repo_root = tmp_path / "repo"
    (repo_root / "logics" / "release").mkdir(parents=True)
    (repo_root / "pyproject.toml").write_text('[project]\nname = "demo-py"\nversion = "0.1.0"\n', encoding="utf-8")
    (repo_root / ".claude-plugin").mkdir()
    (repo_root / ".claude-plugin" / "plugin.json").write_text(
        json.dumps({"name": "demo-py", "version": "0.1.0"}), encoding="utf-8",
    )

    release_discover_payload(repo_root, write=True)
    draft_path = repo_root / "logics" / "release" / "contract.draft.json"
    draft = json.loads(draft_path.read_text(encoding="utf-8"))

    assert {"path": ".claude-plugin/plugin.json", "format": "json", "selector": "version", "required": True} in draft["version_sources"]


def test_real_contract_declares_package_lock_as_a_version_source() -> None:
    """req_323/item_671: package-lock.json's version fell one patch behind
    package.json's after a release and nothing noticed. It is now one more
    required version source in the same cross-check every other version
    file already goes through."""
    contract = _load_json(RELEASE_ROOT / "contract.json")
    assert {"path": "package-lock.json", "format": "json", "selector": "version", "required": True} in contract["version_sources"]


def test_real_repo_version_sources_are_currently_consistent() -> None:
    """The real repo's version metadata (VERSION, pyproject.toml, package.json,
    package-lock.json, README badge, plugin.json) must all agree right now -
    this is the state the drift check exists to keep true."""
    context = load_release_context(REPO_ROOT)
    assert context.contract is not None
    target_version, version_sources = _current_version(REPO_ROOT, context.contract)
    assert target_version is not None, f"version sources disagree or are unreadable: {version_sources}"


def test_a_stale_package_lock_version_is_caught_as_a_blocking_disagreement(tmp_path: Path) -> None:
    """Reproduces the exact drift found in req_323's review: proves the
    mechanism would have caught it, not just that a source is configured."""
    repo_root = tmp_path / "repo"
    (repo_root / "logics" / "release").mkdir(parents=True)
    (repo_root / "VERSION").write_text("1.0.0\n", encoding="utf-8")
    (repo_root / "package.json").write_text(json.dumps({"version": "1.0.0"}), encoding="utf-8")
    (repo_root / "package-lock.json").write_text(json.dumps({"version": "0.9.0"}), encoding="utf-8")
    contract = {
        "version_sources": [
            {"path": "VERSION", "format": "plain_text", "required": True},
            {"path": "package.json", "format": "json", "selector": "version", "required": True},
            {"path": "package-lock.json", "format": "json", "selector": "version", "required": True},
        ]
    }
    (repo_root / "logics" / "release" / "contract.json").write_text(json.dumps(contract), encoding="utf-8")

    context = load_release_context(repo_root)
    target_version, version_sources = _current_version(repo_root, context.contract)

    assert target_version is None
    blocking_reasons = _version_source_blocking_reasons(version_sources)
    assert any("disagree" in reason for reason in blocking_reasons)
