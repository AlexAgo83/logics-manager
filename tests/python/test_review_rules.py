"""Recurring review comments, checked on every diff."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from logics_manager import review_rules
from logics_manager.review_rules import add_rule, check, import_comments, load_rules


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-c", "user.name=t", "-c", "user.email=t@t", "-C", str(repo), *args], check=True, capture_output=True)


def _repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    (repo / "logics").mkdir(parents=True)
    (repo / "app.py").write_text("x = 1\n", encoding="utf-8")
    _git(repo, "init", "-q", "-b", "main")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-qm", "init")
    _git(repo, "checkout", "-qb", "feature")
    return repo


def test_a_pattern_rule_flags_only_added_lines_in_matching_files(tmp_path: Path) -> None:
    repo = _repo(tmp_path)
    add_rule(repo, title="No debug print", pattern=r"print\(", glob="*.py", source="PR #12")
    add_rule(repo, title="Env var documented")
    (repo / "app.py").write_text('x = 1\nprint("debug")\n', encoding="utf-8")
    (repo / "new_module.py").write_text('print("untracked")\n', encoding="utf-8")
    (repo / "notes.md").write_text('print("not python")\n', encoding="utf-8")

    payload = check(repo, "main")

    assert payload["ok"] is False
    assert sorted((hit["path"], hit["line"]) for hit in payload["hits"]) == [("app.py", 2), ("new_module.py", 1)]
    assert [rule["title"] for rule in payload["manual"]] == ["Env var documented"]
    stored = json.loads((repo / "logics" / "review" / "rules.json").read_text(encoding="utf-8"))
    assert [rule["id"] for rule in stored["rules"]] == ["rule_001", "rule_002"]


def test_a_clean_diff_passes_and_no_rules_means_nothing_to_check(tmp_path: Path) -> None:
    repo = _repo(tmp_path)
    assert load_rules(repo) == []
    assert check(repo, "main")["ok"] is True
    add_rule(repo, title="No debug print", pattern=r"print\(")
    assert check(repo, "main")["ok"] is True


def test_import_proposes_a_clean_rule_per_reviewer_comment(tmp_path: Path, monkeypatch) -> None:
    pages = {
        "repos/o/r/pulls/7": json.dumps({"user": {"login": "author"}}),
        "repos/o/r/pulls/7/comments": "\n".join(json.dumps(c) for c in [
            {"user": {"login": "rev"}, "body": "> print(x)\n\n🔥 **Use** the logger here", "path": "src/app.py", "line": 4},
            {"user": {"login": "author"}, "body": "Done", "path": "src/app.py", "line": 4},
            {"user": {"login": "ci[bot]", "type": "Bot"}, "body": "Coverage dropped", "path": "a.py", "line": 1},
        ]),
        "repos/o/r/pulls/7/reviews": "\n".join(json.dumps(r) for r in [
            {"user": {"login": "rev"}, "body": "✅ Document the new env var"},
            {"user": {"login": "rev"}, "body": ""},
        ]),
    }
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        assert cmd[:2] == ["gh", "api"]
        return subprocess.CompletedProcess(cmd, 0, stdout=pages[cmd[2]], stderr="")

    monkeypatch.setattr(review_rules.subprocess, "run", fake_run)
    payload = import_comments(tmp_path, 7, "o/r")

    assert [(p["author"], p["path"]) for p in payload["proposals"]] == [("rev", "src/app.py"), ("rev", None)]
    assert payload["proposals"][0]["command"] == (
        "logics-manager review add --title 'Use the logger here' --source 'PR #7 (rev)' --glob '*.py'")
    assert "--title 'Document the new env var'" in payload["proposals"][1]["command"]
    assert all("--paginate" in cmd for cmd in calls if cmd[2].endswith(("/comments", "/reviews")))
    assert not (tmp_path / "logics" / "review" / "rules.json").exists()


def test_import_fails_clearly_when_gh_fails(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(review_rules.subprocess, "run",
                        lambda cmd, **kwargs: subprocess.CompletedProcess(cmd, 1, stdout="", stderr="HTTP 404"))
    try:
        import_comments(tmp_path, 7, "o/r")
    except SystemExit as error:
        assert "HTTP 404" in str(error)
    else:
        raise AssertionError("expected SystemExit")
