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


# --- item_576: precise validation evidence is accepted ---------------------


FIELD_VALIDATION_BLOB = (
    "npm test passed (26 assertions, 0 failures); npm run lint passed; "
    "npm run check:size passed; npm run build passed; npm run a11y passed; "
    "drag states verified by scripts/capture-drag-states.mjs (is-target, is-blocked, "
    "is-dragging observed and cleared after Escape-cancel)"
)


@pytest.mark.parametrize(
    ("bullet", "expected"),
    [
        # The exact string rejected in the field. Regression from v2.10.0 (72d3553e).
        (FIELD_VALIDATION_BLOB, True),
        ("`npm test` passed on 2026-08-01: 26 assertions, 0 failures.", True),
        ("pytest passed with no failures.", True),
        ("suite passed, zero failures", True),
        # Genuinely weak evidence must still be refused.
        ("npm test failed with 3 errors.", False),
        ("the suite is failing.", False),
        ("npm test passed but 2 failures remain.", False),
        ("(no validation recorded yet)", False),
        ("Run `npm test`.", False),
        ("todo: run the suite.", False),
        ("validation pending.", False),
    ],
)
def test_validation_evidence_accepts_precision_and_rejects_weakness(bullet: str, expected: bool) -> None:
    from logics_manager.flow_evidence import has_validation_evidence

    assert has_validation_evidence(f"# Validation\n- {bullet}\n") is expected


def test_validation_evidence_repair_hint_is_itself_acceptable() -> None:
    """The old hint suggested `... passed`, and `...` is a rejection marker."""
    from logics_manager.flow import validate_closeout_payload  # noqa: F401
    from logics_manager.flow_evidence import has_validation_evidence

    suggested = "npm test passed on 2026-08-01: 26 assertions, 0 failures"
    assert has_validation_evidence(f"# Validation\n- {suggested}\n") is True
    assert has_validation_evidence("# Validation\n- ... passed\n") is False


# --- item_577: kind-aware, honestly exitable indicator updates -------------


def _write_indicator_doc(repo_root: Path, rel: str, ref: str, lines: list[str]) -> str:
    (repo_root / "logics" / rel).mkdir(parents=True, exist_ok=True)
    (repo_root / "logics" / rel / f"{ref}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return ref


def test_indicator_not_declared_by_the_kind_is_rejected_naming_the_accepted_set(tmp_path: Path) -> None:
    from logics_manager.sync import update_workflow_indicators_payload

    repo_root = _repo(tmp_path)
    ref = _write_indicator_doc(
        repo_root, "roadmap", "road_001_probe",
        ["## road_001_probe - Probe", "> Date: 2026-08-01", "> Status: Active",
         "> Related product: (none yet)", "> Related request: (none yet)", "> Reminder: Update."],
    )

    with pytest.raises(SystemExit) as excinfo:
        update_workflow_indicators_payload(repo_root, ref, {"Understanding": "92"})

    message = str(excinfo.value)
    assert "not accepted for roadmap" in message
    assert "Status" in message  # names what the kind does accept


def test_mutation_path_and_linter_read_the_same_per_kind_declaration() -> None:
    from logics_manager.lint import KINDS
    from logics_manager.sync import MUTABLE_WORKFLOW_INDICATORS, approved_indicators_for_kind

    for kind, spec in KINDS.items():
        allowed = set(approved_indicators_for_kind(kind))
        # One declaration: the mutation path may not accept anything the kind does
        # not declare as mutable, and Progress only where the linter requires it.
        assert allowed <= set(spec.mutable_indicators)
        assert allowed <= set(MUTABLE_WORKFLOW_INDICATORS)
        if not spec.requires_progress:
            assert "Progress" not in allowed
    # A roadmap must reject the numeric indicators the old gate recommended.
    assert "Understanding" not in approved_indicators_for_kind("roadmap")
    # A task must still accept the descriptive fields its template carries.
    assert {"Status", "Theme", "Complexity", "Progress"} <= set(approved_indicators_for_kind("task"))


def test_touch_re_baselines_without_changing_any_value(tmp_path: Path) -> None:
    from logics_manager.sync import update_workflow_indicators_payload

    repo_root = _repo(tmp_path)
    ref = _write_indicator_doc(
        repo_root, "roadmap", "road_001_probe",
        ["## road_001_probe - Probe", "> Date: 2026-08-01", "> Status: Active",
         "> Related product: (none yet)", "> Related request: (none yet)", "> Reminder: Update."],
    )
    before = (repo_root / "logics" / "roadmap" / f"{ref}.md").read_text(encoding="utf-8")

    payload = update_workflow_indicators_payload(repo_root, ref, {}, touch=True)
    after = (repo_root / "logics" / "roadmap" / f"{ref}.md").read_text(encoding="utf-8")

    assert payload["touched"] is True
    assert payload["changed"] is False
    assert "> Indicators reviewed:" in after
    for line in before.splitlines():
        if line.startswith("> "):
            assert line in after, f"touch altered {line!r}"


def test_touch_is_offered_by_the_gate_and_the_remedy_only_names_accepted_flags(tmp_path: Path) -> None:
    from logics_manager.lint import MUTABLE_INDICATOR_FLAGS, KINDS

    # The roadmap kind declares no numeric indicator, so the old hint's
    # --understanding/--confidence could never satisfy it.
    roadmap_mutable = set(KINDS["roadmap"].required_indicators) & set(MUTABLE_INDICATOR_FLAGS)
    assert "Understanding" not in roadmap_mutable
    assert "Confidence" not in roadmap_mutable
    assert roadmap_mutable == {"Status"}


def test_indicator_write_preserves_the_template_percent_form(tmp_path: Path) -> None:
    from logics_manager.sync import update_workflow_indicators_payload

    repo_root = _repo(tmp_path)
    ref = _write_indicator_doc(
        repo_root, "request", "req_001_probe",
        ["## req_001_probe - Probe", "> From version: 2.19.5",
         "> Understanding: 90%", "> Confidence: 85%"],
    )

    update_workflow_indicators_payload(repo_root, ref, {"Understanding": "92"})
    text = (repo_root / "logics" / "request" / f"{ref}.md").read_text(encoding="utf-8")

    assert "> Understanding: 92%" in text
    assert "> Understanding: 92\n" not in text


def test_an_existing_document_can_be_linked_to_a_chain_by_command(tmp_path: Path) -> None:
    from logics_manager.sync import update_workflow_indicators_payload

    repo_root = _repo(tmp_path)
    ref = _write_indicator_doc(
        repo_root, "product", "prod_001_probe",
        ["## prod_001_probe - Probe", "> Date: 2026-08-01", "> Status: Proposed",
         "> Related request: (none yet)", "> Related backlog: (none yet)",
         "> Related task: (none yet)", "> Reminder: Update."],
    )

    payload = update_workflow_indicators_payload(
        repo_root, ref, {"Related request": "`req_300_probe`"}
    )
    text = (repo_root / "logics" / "product" / f"{ref}.md").read_text(encoding="utf-8")

    assert payload["changed"] is True
    assert "> Related request: `req_300_probe`" in text
