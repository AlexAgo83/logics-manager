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
