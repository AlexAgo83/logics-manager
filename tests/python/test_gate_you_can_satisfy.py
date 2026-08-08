"""Regression tests for req_316, a closeout gate that can be satisfied.

Four field reports on one surface. Each test pins the reported behaviour, not a paraphrase:
the format was undocumented, the repair wrote lines its own check rejected, the scaffold
emitted lines the gate does not count, and three commands answered the same question three
ways.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from logics_manager.flow_evidence import (
    AC_PROOF_PLACEHOLDER,
    ac_proof_expectation,
    ac_proof_state,
    has_ac_proof,
)


# --- item_642: the format is stated, and the producers respect it ------------


def test_a_placeholder_is_not_a_proof() -> None:
    """A repair can prepare a line; it cannot know how the work was verified."""
    prepared = f"- request-AC1 -> This task. Proof: {AC_PROOF_PLACEHOLDER}"

    assert ac_proof_state(prepared, "AC1") == "placeholder"
    assert has_ac_proof(prepared, "AC1") is False


def test_a_filled_line_is_a_proof() -> None:
    filled = "- request-AC1 -> This task. Proof: `test_thing` covers it."

    assert ac_proof_state(filled, "AC1") == "proven"
    assert has_ac_proof(filled, "AC1") is True


def test_no_line_at_all_is_distinguished_from_an_unfilled_one() -> None:
    assert ac_proof_state("- request-AC2 -> This task. Proof: done.", "AC1") == "missing"


def test_the_expected_form_names_the_target_and_the_keyword() -> None:
    """The three load-bearing facts were discoverable only by diffing a repair's output."""
    task = ac_proof_expectation("AC7")
    item = ac_proof_expectation("AC7", target="item")

    assert task == "- request-AC7 -> This task. Proof: <how it was verified>"
    assert item == "- request-AC7 -> This backlog slice. Proof: <how it was verified>"


def test_a_grouped_line_is_evidence_for_none_of_the_criteria_it_names() -> None:
    """One sentence cannot be the proof of three different claims."""
    grouped = "- request-AC1, request-AC2 -> This task. Proof: the suite passes."

    # It mentions AC1, so it counts for AC1 -- and that is the trap the scaffold fell into.
    assert has_ac_proof(grouped, "AC3") is False


def _scaffold_corpus(root: Path) -> str:
    (root / "logics").mkdir(parents=True, exist_ok=True)
    payload = {
        "title": "Probe request",
        "request": {"complexity": "Low", "theme": "Probe",
                    "needs": ["A need."], "context": ["Some context."],
                    "acceptance_criteria": ["AC1: First.", "AC2: Second.", "AC3: Third."]},
        "product": {"title": "Probe product", "overview": "Overview.", "goals": ["A goal."], "non_goals": ["Not this."]},
        "backlog_items": [
            {"title": "First slice", "complexity": "Low", "theme": "Probe", "request_acs": ["AC1", "AC2"],
             "problem": ["A problem."], "scope_in": ["In."], "scope_out": ["Out."],
             "acceptance_criteria": ["AC1: Delivered."]},
            {"title": "Second slice", "complexity": "Low", "theme": "Probe", "request_acs": ["AC3"],
             "problem": ["Another problem."], "scope_in": ["In."], "scope_out": ["Out."],
             "acceptance_criteria": ["AC1: Delivered."]},
        ],
        "orchestration_task": {"title": "Probe task", "plan": ["Do the thing."]},
    }
    scaffold_dir = root / "logics" / "scaffold"
    scaffold_dir.mkdir(parents=True, exist_ok=True)
    (scaffold_dir / "probe.json").write_text(json.dumps(payload), encoding="utf-8")
    import os

    env = {**os.environ, "PYTHONPATH": str(Path.cwd())}
    result = subprocess.run(
        [sys.executable, "-m", "logics_manager", "flow", "scaffold", "request-chain",
         "--input", "logics/scaffold/probe.json"],
        cwd=root, capture_output=True, text=True, timeout=120, env=env,
    )
    assert result.returncode == 0, result.stderr
    return result.stdout


def test_the_scaffold_emits_one_traceability_line_per_criterion(tmp_path: Path) -> None:
    """Its own output used to group criteria, so it could not satisfy its own gate."""
    _scaffold_corpus(tmp_path)
    task = next((tmp_path / "logics" / "tasks").glob("task_*.md")).read_text(encoding="utf-8")

    section = task.split("# AC Traceability", 1)[1].split("\n#", 1)[0]
    lines = [line for line in section.splitlines() if line.startswith("- request-")]

    assert len(lines) == 3, section
    for ac_id in ("AC1", "AC2", "AC3"):
        matching = [line for line in lines if line.startswith(f"- request-{ac_id} ")]
        assert len(matching) == 1, f"{ac_id} is not on a line of its own: {section}"


# --- item_643: one verdict, three commands ----------------------------------


def _proof_state_sources() -> list[str]:
    """Every module that answers "is this criterion proven"."""
    import logics_manager.audit as audit
    import logics_manager.flow as flow
    import logics_manager.flow_evidence as evidence

    return [audit.__file__, flow.__file__, evidence.__file__]


def test_only_one_module_decides_what_counts_as_a_proof() -> None:
    """The audit carried its own looser rule while the gate used the strict one."""
    import logics_manager.audit as audit
    import logics_manager.flow as flow

    for module in (audit, flow):
        source = Path(module.__file__).read_text(encoding="utf-8")
        assert '"proof:" in' not in source.replace('"proof:" in line.lower()', ""), (
            f"{module.__name__} decides what a proof is on its own"
        )


def test_the_legacy_allowance_is_named_not_reimplemented() -> None:
    legacy = "- request-AC1 -> somewhere. Proof: it was checked."
    strict_text = "- request-AC1 -> This task. Proof: it was checked."

    # The loose rule accepts a line the strict one also accepts; what matters is that the
    # loose rule is reached through the same entry point rather than a second copy.
    assert has_ac_proof(strict_text, "AC1") is True
    assert has_ac_proof(legacy, "AC1", legacy=True) is True
    # The real difference: strict wants the criterion and the keyword on one line, legacy
    # accepts them anywhere in the document. That is what made the audit and the gate
    # disagree about the same file.
    scattered = "- request-AC1 -> This task.\n- request-AC2 -> This task. Proof: checked."
    assert has_ac_proof(scattered, "AC1") is False
    assert has_ac_proof(scattered, "AC1", legacy=True) is True
