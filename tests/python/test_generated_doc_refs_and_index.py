"""Regression tests for req_324, generation that never checked its own output.

Three defects found on 2026-08-09 while authoring the first seven roadmap docs:
`flow roadmap propose` wrote refs the audit rejects, `logics index` titled a document
with its last `## ` heading, and `flow promote` truncated a wrapped acceptance criterion
at its first physical line.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from logics_manager.audit import audit_payload
from logics_manager.cli import main
from logics_manager.flow.docs import _bullet_values, resolve_ref_slug
from logics_manager.index import index_payload


def _repo(tmp_path: Path, *dirs: str) -> Path:
    repo_root = tmp_path / "logics-repo"
    for rel in dirs:
        (repo_root / "logics" / rel).mkdir(parents=True, exist_ok=True)
    return repo_root


def _write_request(repo_root: Path, ref: str, *, acceptance: str = "- AC1: The slice is bounded.") -> Path:
    path = repo_root / "logics" / "request" / f"{ref}.md"
    path.write_text(
        "\n".join(
            [
                f"## {ref} - Probe request",
                "> From version: 2.21.2",
                "> Schema version: 1.0",
                "> Status: Draft",
                "> Understanding: 90%",
                "> Confidence: 85%",
                "",
                "# Needs",
                "- Deliver the probe.",
                "",
                "# Acceptance criteria",
                acceptance,
                "",
            ]
        ),
        encoding="utf-8",
    )
    return path


# --- defect 1: a short ref must not reach the page ---------------------------


def test_roadmap_propose_resolves_a_short_ref_to_its_full_slug(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = _repo(tmp_path, "request", "roadmap")
    _write_request(repo_root, "req_296_add_first_class_roadmap_planning")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    assert main(["flow", "roadmap", "propose", "--title", "2.19: probe", "--milestone", "2.19.0: first", "--request-ref", "req_296"]) == 0

    written = next((repo_root / "logics" / "roadmap").glob("road_*.md")).read_text(encoding="utf-8")
    assert "`req_296_add_first_class_roadmap_planning`" in written
    assert "`req_296`" not in written


def test_roadmap_propose_refuses_an_unresolvable_ref_before_writing(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = _repo(tmp_path, "request", "roadmap")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    with pytest.raises(SystemExit) as excinfo:
        main(["flow", "roadmap", "propose", "--title", "Probe", "--milestone", "1.0: x", "--request-ref", "req_9999"])

    assert "req_9999" in str(excinfo.value)
    assert not list((repo_root / "logics" / "roadmap").glob("road_*.md"))


def test_a_generated_roadmap_with_short_refs_passes_the_audit(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = _repo(tmp_path, "request", "backlog", "tasks", "roadmap", "product", "architecture", "specs")
    _write_request(repo_root, "req_296_add_first_class_roadmap_planning")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    main(
        [
            "flow", "roadmap", "propose",
            "--title", "2.19: probe",
            "--milestone", "2.19.0: first",
            "--milestone", "2.19.1: second",
            "--request-ref", "req_296",
        ]
    )

    roadmap = next((repo_root / "logics" / "roadmap").glob("road_*.md"))
    blocking = [
        issue
        for issue in audit_payload(repo_root)["issues"]
        if issue["path"].endswith(roadmap.name) and issue.get("severity") != "warning"
    ]
    assert blocking == [], blocking


def test_resolve_ref_slug_leaves_a_full_slug_alone(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path, "request")
    _write_request(repo_root, "req_296_add_first_class_roadmap_planning")

    assert resolve_ref_slug(repo_root, "req_296_add_first_class_roadmap_planning") == "req_296_add_first_class_roadmap_planning"
    assert resolve_ref_slug(repo_root, "`req_296`") == "req_296_add_first_class_roadmap_planning"


# --- defect 2: only the first `## ` line is the document heading -------------


def test_index_titles_a_doc_by_its_heading_not_its_last_section(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path, "roadmap")
    (repo_root / "logics" / "roadmap" / "road_001_keeping_the_viewer_alive.md").write_text(
        "\n".join(
            [
                "## road_001_keeping_the_viewer_alive - 2.15: keeping the viewer alive",
                "> Date: 2026-08-09",
                "> Status: Settled",
                "",
                "# Milestones",
                "## 2.15.0 - shared assets",
                "- Delivered: something.",
                "",
                "## 2.15.7 - crash post-mortems",
                "- Delivered: something else.",
                "",
            ]
        ),
        encoding="utf-8",
    )

    index_payload(repo_root)
    row = next(
        line
        for line in (repo_root / "logics" / "INDEX.md").read_text(encoding="utf-8").splitlines()
        if "road_001_keeping_the_viewer_alive.md)" in line
    )
    assert "| 2.15: keeping the viewer alive |" in row
    assert "crash post-mortems" not in row
    assert "[road_001_keeping_the_viewer_alive]" in row


# --- defect 3: a wrapped bullet is one value, not its first line -------------


def test_bullet_values_rejoins_a_wrapped_bullet() -> None:
    assert _bullet_values(
        [
            "- AC1: resolves the short form to the full slug on write,",
            "  or fails with an error naming the unresolvable ref.",
            "- AC2: single line.",
        ]
    ) == [
        "AC1: resolves the short form to the full slug on write, or fails with an error naming the unresolvable ref.",
        "AC2: single line.",
    ]


def test_promote_carries_a_wrapped_acceptance_criterion_in_full(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = _repo(tmp_path, "request", "backlog")
    _write_request(
        repo_root,
        "req_324_probe",
        acceptance="\n".join(
            [
                "- AC1: `flow roadmap propose --request-ref req_296` resolves the short form to the full",
                "  slug on write, or fails with an error naming the unresolvable ref.",
            ]
        ),
    )
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    assert main(["flow", "promote", "request-to-backlog", "req_324_probe"]) == 0

    slice_text = next((repo_root / "logics" / "backlog").glob("item_*.md")).read_text(encoding="utf-8")
    assert "or fails with an error naming the unresolvable ref." in slice_text
    assert "resolves the short form to the full\n" not in slice_text
