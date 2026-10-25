"""Code anchors: what a workflow doc says about the code, checked against the checkout."""

from __future__ import annotations

import subprocess
from pathlib import Path

from logics_manager.code_anchors import unresolved_anchors


def test_urls_and_ignored_paths_are_not_reported_even_beside_an_outside_path(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    (repo / "src").mkdir(parents=True)
    (repo / "src" / "app.py").write_text("x = 1\n", encoding="utf-8")
    (repo / ".gitignore").write_text("local/\n", encoding="utf-8")
    subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
    text = "\n".join([
        "# References",
        "- `src/app.py`",
        "- `https://example.com/docs/page`",
        "- `local/notes.md`",
        # Outside the repository: `git check-ignore` exits 128 on it, which used to drop
        # the ignore filter for every other path in the same call.
        "- `../sibling/x.py`",
        "- `src/gone.py`",
    ])

    missing_paths, _ = unresolved_anchors(repo, text)

    assert missing_paths == ["../sibling/x.py", "src/gone.py"]
