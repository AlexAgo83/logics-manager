"""Regression tests for req_300, agent-facing correctness of generated docs and CLI contracts.

Each test pins a defect recorded in prod_048. Where the field report captured a
verbatim string, the test uses that string rather than a paraphrase.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from logics_manager.cli import main
from logics_manager.index import index_payload, render_index


PAST_TENSE_CLAIMS = ("Created ", "Wrote ", "Scaffolded ", "Updated ", "Appended ")


def _repo(tmp_path: Path, *dirs: str) -> Path:
    repo_root = tmp_path / "logics-repo"
    for rel in dirs:
        (repo_root / "logics" / rel).mkdir(parents=True, exist_ok=True)
    return repo_root


# --- item_573: dry-run and command output report what actually happened -----


def test_companion_dry_run_makes_no_creation_claim_and_writes_nothing(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = _repo(tmp_path, "architecture")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "companion", "architecture", "--title", "Probe", "--dry-run"])
    out = capsys.readouterr().out

    assert exit_code == 0
    assert "Would create companion doc:" in out
    assert not any(claim in out for claim in PAST_TENSE_CLAIMS)
    assert list((repo_root / "logics" / "architecture").glob("*.md")) == []


def test_roadmap_propose_dry_run_makes_no_creation_claim_and_writes_nothing(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = _repo(tmp_path, "roadmap")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(
        ["flow", "roadmap", "propose", "--title", "Probe", "--milestone", "0.1 - One", "--dry-run"]
    )
    out = capsys.readouterr().out

    assert exit_code == 0
    assert "Would create roadmap:" in out
    assert not any(claim in out for claim in PAST_TENSE_CLAIMS)
    assert list((repo_root / "logics" / "roadmap").glob("*.md")) == []


def test_index_distinguishes_a_write_from_a_no_op(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path, "request")

    first = index_payload(repo_root)
    assert first["changed"] is True
    assert render_index(repo_root).startswith("Unchanged ")

    second = index_payload(repo_root)
    assert second["changed"] is False


def test_flow_start_names_every_document_it_modified(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    from tests.python.flow_start_fixture import write_task_with_linked_items

    repo_root = _repo(tmp_path, "tasks", "backlog")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    task_ref, item_refs = write_task_with_linked_items(repo_root)

    exit_code = main(["flow", "start", task_ref])
    out = capsys.readouterr().out

    assert exit_code == 0
    reported = {line.removeprefix("- changed: ") for line in out.splitlines() if line.startswith("- changed: ")}
    # The defect: only the named task was announced while linked items were also written.
    expected = {f"logics/tasks/{task_ref}.md"} | {f"logics/backlog/{ref}.md" for ref in item_refs}
    assert expected == reported, f"unreported modifications: {expected - reported}"


def test_flow_progress_states_the_resulting_value(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    from tests.python.flow_start_fixture import write_task_with_linked_items

    repo_root = _repo(tmp_path, "tasks", "backlog")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    task_ref, _ = write_task_with_linked_items(repo_root)

    exit_code = main(["flow", "progress", "task", task_ref, "--progress", "40%"])
    out = capsys.readouterr().out

    assert exit_code == 0
    assert "40%" in out


def test_index_json_payload_exposes_changed(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path, "request")
    index_payload(repo_root)
    rendered = json.loads(render_index(repo_root, output_format="json"))
    assert rendered["changed"] is False


# --- item_574: roadmap headings that are not parsed as milestones -----------


ROADMAP_HEADINGS = (
    "## 0.9.1 - Lot 3: Candidate list and pipeline P0 fixes",
    "## 0.9.2 - Lot 4: Code review remediation and structural headroom",
    "## 0.9.3 - Lot 5: Candidate and pipeline UX remediation",
    "## 0.9.S - Lot S: Security posture (parallel track)",
)


def _write_roadmap(repo_root: Path, ref: str = "road_001_probe") -> str:
    (repo_root / "logics" / "roadmap" / f"{ref}.md").write_text(
        "\n".join(
            [
                f"## {ref} - Probe roadmap",
                "> Date: 2026-08-01",
                "> Status: Active",
                "> Related product: (none yet)",
                "> Related request: (none yet)",
                "> Reminder: Update this doc.",
                "",
                *ROADMAP_HEADINGS,
                "",
            ]
        ),
        encoding="utf-8",
    )
    return ref


def test_roadmap_validate_names_every_heading_it_did_not_parse(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = _repo(tmp_path, "roadmap")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    ref = _write_roadmap(repo_root)

    exit_code = main(["flow", "roadmap", "validate", ref])
    out = capsys.readouterr().out

    assert exit_code == 0
    assert "- milestones: 3" in out
    # The field defect: this heading vanished with no warning.
    assert "0.9.S - Lot S: Security posture (parallel track)" in out
    assert "not parsed as a milestone" in out


def test_roadmap_milestone_count_and_warnings_account_for_every_heading(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = _repo(tmp_path, "roadmap")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    ref = _write_roadmap(repo_root)

    main(["flow", "roadmap", "validate", ref, "--format", "json"])
    payload = json.loads(capsys.readouterr().out)

    assert payload["milestone_count"] + len(payload["unparsed_headings"]) == len(ROADMAP_HEADINGS)
    assert payload["unparsed_headings"] == ["## 0.9.S - Lot S: Security posture (parallel track)"]


def test_roadmap_validate_reports_no_unparsed_headings_when_all_parse(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = _repo(tmp_path, "roadmap")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    ref = "road_002_clean"
    (repo_root / "logics" / "roadmap" / f"{ref}.md").write_text(
        "\n".join(
            [
                f"## {ref} - Clean roadmap",
                "> Date: 2026-08-01",
                "> Status: Active",
                "> Related product: (none yet)",
                "> Related request: (none yet)",
                "> Reminder: Update this doc.",
                "",
                "## 0.9.1 - One",
                "## 0.9.2 - Two",
                "",
            ]
        ),
        encoding="utf-8",
    )

    main(["flow", "roadmap", "validate", ref, "--format", "json"])
    payload = json.loads(capsys.readouterr().out)

    assert payload["milestone_count"] == 2
    assert payload["unparsed_headings"] == []


# --- item_575: scaffolded tasks assert nothing that has not happened --------


SCAFFOLD_INPUT = {
    "title": "Probe chain",
    "from_version": "2.19.5",
    "request": {
        "complexity": "Low",
        "theme": "Probe",
        "acceptance_criteria": [
            "AC1: First thing.",
            "AC2: Second thing.",
            "AC3: Nobody claims me.",
        ],
    },
    "product": {"title": "Probe product", "overview": "Probe."},
    "backlog_items": [
        {"title": "Slice A", "request_acs": ["AC1"], "acceptance_criteria": ["AC1: A done."]},
        {"title": "Slice B", "request_acs": ["AC2"], "acceptance_criteria": ["AC1: B done."]},
    ],
    "orchestration_task": {"title": "Orchestrate probe", "plan": ["Do it."]},
}

COMPLETION_CLAIMS = ("Implementation complete", "complete.", "is done", "passed")


def _scaffold(repo_root: Path, payload: dict | None = None) -> Path:
    (repo_root / "logics" / "scaffold").mkdir(parents=True, exist_ok=True)
    input_path = repo_root / "logics" / "scaffold" / "probe.json"
    input_path.write_text(json.dumps(payload or SCAFFOLD_INPUT), encoding="utf-8")
    return input_path


def _scaffold_repo(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, payload: dict | None = None) -> Path:
    repo_root = _repo(tmp_path, "request", "backlog", "tasks", "product", "scaffold")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    _scaffold(repo_root, payload)
    return repo_root


def test_scaffolded_task_makes_no_completion_claim(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    repo_root = _scaffold_repo(tmp_path, monkeypatch)
    main(["flow", "scaffold", "request-chain", "--input", "logics/scaffold/probe.json"])
    capsys.readouterr()

    task_text = next((repo_root / "logics" / "tasks").glob("*.md")).read_text(encoding="utf-8")
    report = task_text.split("# Report", 1)[1].split("#", 1)[0]
    assert "Not started." in report
    assert not any(claim in report for claim in COMPLETION_CLAIMS)
    assert "Implementation complete" not in task_text


def test_scaffolded_traceability_is_derived_from_request_acs(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    repo_root = _scaffold_repo(tmp_path, monkeypatch)
    main(["flow", "scaffold", "request-chain", "--input", "logics/scaffold/probe.json"])
    capsys.readouterr()

    task_text = next((repo_root / "logics" / "tasks").glob("*.md")).read_text(encoding="utf-8")
    trace = task_text.split("# AC Traceability", 1)[1].split("\n# ", 1)[0]
    assert "request-AC1 -> `item_001_slice_a`" in trace
    assert "request-AC2 -> `item_002_slice_b`" in trace
    # The old boilerplate claimed the scaffold command's own criteria.
    assert "scaffold command generated the request-chain corpus" not in trace
    assert "CLI help documents the one-pass scaffold workflow" not in trace


def test_scaffold_reports_request_acs_claimed_by_no_backlog_item(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    _scaffold_repo(tmp_path, monkeypatch)
    main(["flow", "scaffold", "request-chain", "--input", "logics/scaffold/probe.json"])
    out = capsys.readouterr().out

    assert "request AC3 is claimed by no backlog item" in out


def test_scaffold_json_payload_lists_unclaimed_request_acs(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    _scaffold_repo(tmp_path, monkeypatch)
    main(["flow", "scaffold", "request-chain", "--input", "logics/scaffold/probe.json", "--format", "json"])
    payload = json.loads(capsys.readouterr().out)

    assert payload["unclaimed_request_acs"] == ["AC3"]


def test_scaffolded_validation_section_is_rejected_by_the_closeout_gate(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    from logics_manager.flow_evidence import has_validation_evidence

    repo_root = _scaffold_repo(tmp_path, monkeypatch)
    main(["flow", "scaffold", "request-chain", "--input", "logics/scaffold/probe.json"])
    capsys.readouterr()

    task_text = next((repo_root / "logics" / "tasks").glob("*.md")).read_text(encoding="utf-8")
    assert "- (no validation recorded yet)" in task_text
    assert has_validation_evidence(task_text) is False


def test_scaffolded_chain_defers_every_request_ac_with_none_suppressed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """The boilerplate's false proofs silenced this check for the ACs it claimed."""
    from logics_manager.audit import audit_payload

    repo_root = _scaffold_repo(tmp_path, monkeypatch)
    main(["flow", "scaffold", "request-chain", "--input", "logics/scaffold/probe.json"])
    capsys.readouterr()

    payload = audit_payload(repo_root, legacy_cutoff_version="1.1.0", group_by_doc=True)
    deferred = {
        finding["message"].split("`")[1]
        for finding in payload["findings"]
        if finding["code"] == "ac_missing_task_traceability"
    }
    assert deferred == {"AC1", "AC2", "AC3"}
