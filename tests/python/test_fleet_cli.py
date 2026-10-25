"""Status and health across every corpus under one root.

There was no way to ask about more than one repository, so an external
orchestrator implemented corpus discovery twice and wrote its own aggregation
loop -- including the decision that one repository's failure must not fail the
whole report.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from logics_manager.fleet import discover_corpora, fleet_payload

REPO_ROOT = Path(__file__).resolve().parents[2]


def _bootstrap(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [sys.executable, "-m", "logics_manager", "bootstrap", "--repo-root", str(path)],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=60,
    )
    assert result.returncode == 0, result.stderr
    return path


def _run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "logics_manager", *args],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=120,
    )


@pytest.fixture
def fleet(tmp_path: Path) -> Path:
    root = tmp_path / "projects"
    root.mkdir()
    _bootstrap(root / "alpha")
    _bootstrap(root / "beta")
    (root / "not-a-corpus").mkdir()
    (root / "nested" / "deep").mkdir(parents=True)
    _bootstrap(root / "nested" / "deep" / "gamma")  # too deep to be discovered
    return root


# ---- discovery ----


def test_discovers_immediate_children_holding_a_corpus(fleet: Path) -> None:
    assert [path.name for path in discover_corpora(fleet)] == ["alpha", "beta"]


def test_ignores_directories_without_a_corpus(fleet: Path) -> None:
    assert "not-a-corpus" not in {path.name for path in discover_corpora(fleet)}


def test_does_not_recurse_into_nested_directories(fleet: Path) -> None:
    assert "gamma" not in {path.name for path in discover_corpora(fleet)}


def test_an_empty_root_is_successful_not_an_error(tmp_path: Path) -> None:
    payload = fleet_payload(tmp_path)
    assert payload["ok"] is True
    assert payload["repository_count"] == 0


def test_a_missing_root_is_rejected_by_the_command(tmp_path: Path) -> None:
    result = _run(["fleet", "status", "--root", str(tmp_path / "absent")])
    assert result.returncode != 0
    assert "does not exist" in result.stderr


# ---- reporting ----


@pytest.mark.parametrize("report", ["status", "health"])
def test_reports_every_discovered_repository(report: str, fleet: Path) -> None:
    payload = fleet_payload(fleet, report=report)
    assert set(payload["repositories"]) == {"alpha", "beta"}
    assert payload["report"] == report


def test_json_output_is_keyed_by_repository(fleet: Path) -> None:
    result = _run(["fleet", "health", "--root", str(fleet), "--format", "json"])
    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    assert sorted(payload["repositories"]) == ["alpha", "beta"]


def test_output_is_stable_across_invocations(fleet: Path) -> None:
    first = _run(["fleet", "status", "--root", str(fleet), "--format", "json"]).stdout
    second = _run(["fleet", "status", "--root", str(fleet), "--format", "json"]).stdout
    assert first == second


def test_text_output_names_each_repository(fleet: Path) -> None:
    result = _run(["fleet", "status", "--root", str(fleet)])
    assert result.returncode == 0, result.stderr
    assert "alpha" in result.stdout and "beta" in result.stdout


# ---- failure isolation ----


def test_a_failing_repository_does_not_hide_the_others(fleet: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from logics_manager import fleet as fleet_module

    real = fleet_module.status_payload

    def exploding(path: Path, **kwargs):
        if path.name == "alpha":
            raise ValueError("boom")
        return real(path, **kwargs)

    monkeypatch.setattr(fleet_module, "status_payload", exploding)
    payload = fleet_payload(fleet, report="status")
    assert payload["repositories"]["alpha"]["error"] == "boom"
    assert payload["repositories"]["beta"]["ok"] is True
    assert payload["failed_count"] == 1
    assert payload["ok"] is False


def test_the_exit_code_follows_the_verdict(fleet: Path) -> None:
    result = _run(["fleet", "status", "--root", str(fleet), "--format", "json"])
    assert (result.returncode == 0) == json.loads(result.stdout)["ok"]


def test_help_is_available(fleet: Path) -> None:
    for args in (["fleet", "--help"], ["fleet", "status", "--help"], ["fleet", "health", "--help"]):
        result = _run(args)
        assert result.returncode == 0, args
        assert result.stdout.strip()


# ---- the command surface (item_610) ----


def test_help_without_arguments_reports_usage_and_fails(capsys) -> None:
    """No arguments is a usage error, not a successful no-op."""
    from logics_manager.fleet import main

    assert main([]) == 1
    assert "fleet" in capsys.readouterr().out.lower()


def test_explicit_help_succeeds(capsys) -> None:
    from logics_manager.fleet import main

    assert main(["--help"]) == 0
    assert "fleet" in capsys.readouterr().out.lower()


def test_an_unknown_report_is_rejected() -> None:
    from logics_manager.fleet import main

    with pytest.raises(SystemExit, match="status|health"):
        main(["nonsense"])


def test_a_missing_root_is_rejected(tmp_path: Path) -> None:
    from logics_manager.fleet import main

    with pytest.raises(SystemExit, match="does not exist"):
        main(["status", "--root", str(tmp_path / "absent")])


@pytest.mark.parametrize("report", ["status", "health"])
@pytest.mark.parametrize("fmt", ["text", "json"])
def test_both_reports_render_in_both_formats(report: str, fmt: str, fleet: Path, capsys) -> None:
    from logics_manager.fleet import main

    assert main([report, "--root", str(fleet), "--format", fmt]) == 0
    out = capsys.readouterr().out
    assert out.strip(), f"{report}/{fmt} printed nothing"
    if fmt == "json":
        assert json.loads(out)["report"] == report


def test_the_text_report_names_an_empty_root(tmp_path: Path, capsys) -> None:
    from logics_manager.fleet import main

    assert main(["status", "--root", str(tmp_path)]) == 0
    assert "no Logics corpus" in capsys.readouterr().out


def test_the_text_report_shows_a_failing_repository(fleet: Path, monkeypatch, capsys) -> None:
    from logics_manager import fleet as fleet_module

    monkeypatch.setattr(
        fleet_module, "status_payload", lambda path, **kwargs: (_ for _ in ()).throw(ValueError("boom"))
    )
    assert fleet_module.main(["status", "--root", str(fleet)]) == 1
    out = capsys.readouterr().out
    assert "ERROR" in out and "boom" in out


def test_the_health_text_report_mentions_stale_documents(fleet: Path, monkeypatch, capsys) -> None:
    from logics_manager import fleet as fleet_module

    monkeypatch.setattr(
        fleet_module,
        "health_payload",
        lambda path, **kwargs: {"ok": True, "issue_count": 2, "stale_doc_count": 3, "workflow_doc_count": 9},
    )
    assert fleet_module.main(["health", "--root", str(fleet)]) == 0
    assert "3 stale" in capsys.readouterr().out


def test_the_limit_is_passed_through(fleet: Path, monkeypatch) -> None:
    from logics_manager import fleet as fleet_module

    seen: list[int] = []
    monkeypatch.setattr(
        fleet_module, "status_payload", lambda path, **kwargs: seen.append(kwargs.get("limit")) or {"ok": True}
    )
    fleet_module.main(["status", "--root", str(fleet), "--limit", "3"])
    assert seen and set(seen) == {3}


def test_fleet_roadmap_names_the_first_unfinished_milestone(tmp_path: Path) -> None:
    repo = _bootstrap(tmp_path / "game")
    for ref, status in (("req_001_engine", "Done"), ("req_002_levels", "Done"), ("req_003_sound", "In progress")):
        (repo / "logics" / "request" / f"{ref}.md").write_text(f"## {ref} - {ref}\n> Status: {status}\n", encoding="utf-8")
    (repo / "logics" / "roadmap").mkdir(exist_ok=True)
    (repo / "logics" / "roadmap" / "road_001_launch.md").write_text(
        "## road_001_launch - Launch\n\n"
        "## 0.1 - Core\n- Scope: `req_001_engine`, `req_002_levels`\n\n"
        "## 0.2 - Polish\n- Scope: `req_002_levels`, `req_003_sound`\n\n"
        "## Delivery snapshot\n- `req_003_sound` mentioned outside any milestone\n",
        encoding="utf-8",
    )

    payload = fleet_payload(tmp_path, report="roadmap")
    (roadmap,) = payload["repositories"]["game"]["roadmaps"]

    assert [(m["version"], m["done"], m["total"]) for m in roadmap["milestones"]] == [("0.1", 2, 2), ("0.2", 1, 2)]
    assert roadmap["current"]["version"] == "0.2"
    result = _run(["fleet", "roadmap", "--root", str(tmp_path)])
    assert "game (road_001_launch): 0.2 - Polish: 1/2 done" in result.stdout


def test_fleet_brief_puts_blocked_work_first_and_spreads_projects(tmp_path: Path) -> None:
    def doc(repo: Path, kind_dir: str, ref: str, status: str, extra: str = "") -> None:
        (repo / "logics" / kind_dir / f"{ref}.md").write_text(f"## {ref} - {ref}\n> Status: {status}\n{extra}", encoding="utf-8")

    alpha, beta = _bootstrap(tmp_path / "alpha"), _bootstrap(tmp_path / "beta")
    doc(alpha, "tasks", "task_001_one", "In progress", "# Priority\n- Priority: High\n")
    doc(alpha, "tasks", "task_002_two", "In progress", "# Priority\n- Priority: High\n")
    doc(beta, "tasks", "task_001_stuck", "Blocked")
    doc(beta, "tasks", "task_002_finished", "In progress", "> Progress: 100%\n")
    doc(beta, "tasks", "task_003_three", "In progress", "# Priority\n- Priority: High\n")

    from logics_manager.fleet import fleet_brief

    brief = fleet_brief(tmp_path, limit=4, reviews=False)
    assert [(m["verb"], m["repository"], m["ref"]) for m in brief["moves"]] == [
        ("unblock", "beta", "task_001_stuck"),
        ("close out", "beta", "task_002_finished"),
        ("finish", "alpha", "task_001_one"),
        ("finish", "beta", "task_003_three"),
    ]
    result = _run(["fleet", "brief", "--root", str(tmp_path), "--no-reviews"])
    assert "1. beta: unblock task_001_stuck" in result.stdout


def test_fleet_brief_ranks_review_requests_after_blocked_work(tmp_path: Path, monkeypatch) -> None:
    from logics_manager import fleet

    repo = _bootstrap(tmp_path / "alpha")
    (repo / "logics" / "tasks" / "task_001_stuck.md").write_text("## task_001_stuck - stuck\n> Status: Blocked\n", encoding="utf-8")
    (repo / "logics" / "tasks" / "task_002_open.md").write_text("## task_002_open - open\n> Status: In progress\n", encoding="utf-8")
    outputs = {
        "gh": [{"number": 7, "title": "Fix login", "repository": {"nameWithOwner": "o/web"}, "url": "https://x/7"}],
        "glab api user": {"username": "me"},
        "glab api merge_requests": [{"iid": 3, "title": "Bump api", "references": {"full": "grp/sub/api!3"}, "web_url": "u"}],
    }
    calls = []

    def fake_run(cmd, **kw):
        calls.append(cmd)
        key = "gh" if cmd[0] == "gh" else " ".join(cmd[:2]) + " " + cmd[2].split("?")[0]
        return subprocess.CompletedProcess(cmd, 0, stdout=json.dumps(outputs[key]), stderr="")

    monkeypatch.setattr(fleet.subprocess, "run", fake_run)
    brief = fleet.fleet_brief(tmp_path, limit=4)
    assert [(m["verb"], m["repository"], m["ref"]) for m in brief["moves"]] == [
        ("unblock", "alpha", "task_001_stuck"),
        ("review", "o/web", "#7"),
        ("review", "grp/sub/api", "!3"),
        ("continue", "alpha", "task_002_open"),
    ]
    assert brief["review_error"] is None
    assert "reviewer_username=me" in calls[-1][2] and "scope=all" in calls[-1][2]
    assert "2. o/web: review #7 [review requested] Fix login" in fleet._render_brief(brief)

    def missing(cmd, **kw):
        raise FileNotFoundError(cmd[0])

    monkeypatch.setattr(fleet.subprocess, "run", missing)
    brief = fleet.fleet_brief(tmp_path)
    assert brief["review_error"] is None and all(m["verb"] != "review" for m in brief["moves"])

    def failing(cmd, **kw):
        if cmd[0] == "glab":
            return subprocess.CompletedProcess(cmd, 1, stdout="", stderr="   ERROR  \n\n  Unauthenticated.\n")
        return fake_run(cmd)

    monkeypatch.setattr(fleet.subprocess, "run", failing)
    brief = fleet.fleet_brief(tmp_path, limit=4)
    assert [m["ref"] for m in brief["moves"] if m["verb"] == "review"] == ["#7"]
    assert brief["review_error"] == "glab api user failed: ERROR Unauthenticated."
    assert "review requests unknown: glab api user failed: ERROR Unauthenticated." in fleet._render_brief(brief)
