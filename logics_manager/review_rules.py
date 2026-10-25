"""Review rules: what reviewers keep flagging, checked on every diff before it goes out.

A comment made once in review is usually made again on the next change, by the
next reviewer, about the next author. Writing it down as a rule turns it into a
check: a rule with a pattern is searched for in the lines a diff adds; a rule
without one is a question the author (or their agent) answers before asking for
review. The rules live in the repository, so they apply to everyone's diffs.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import re
import shlex
import subprocess
from datetime import date
from pathlib import Path

from .cli_output import render_payload
from .config import find_repo_root
from .termstyle import colorize_help

RULES_PATH = Path("logics/review/rules.json")

HELP = """Logics Review CLI
Turn recurring review comments into rules checked on every diff.

Usage:
  logics-manager review add --title TEXT [--why TEXT] [--pattern REGEX] [--glob GLOB] [--source TEXT] [--format text|json]
  logics-manager review list [--format text|json]
  logics-manager review check [--base REF] [--format text|json]
  logics-manager review import --pr N [--repo OWNER/REPO] [--format text|json]

`import` reads a GitHub pull request's review comments (with `gh`) and proposes a
`review add` command for each one; it writes nothing.

Rules live in logics/review/rules.json. `check` searches the lines added since
--base (default: origin/main, else main) for each rule's pattern, limited to
files matching its --glob, and exits 1 on a hit. Rules without a pattern are
listed as manual checks.
"""


def _rules_file(repo_root: Path) -> Path:
    return repo_root / RULES_PATH


def load_rules(repo_root: Path) -> list[dict[str, str]]:
    path = _rules_file(repo_root)
    if not path.is_file():
        return []
    document = json.loads(path.read_text(encoding="utf-8"))
    return list(document.get("rules") or [])


def add_rule(repo_root: Path, *, title: str, why: str = "", pattern: str = "", glob: str = "", source: str = "") -> dict[str, object]:
    if pattern:
        try:
            re.compile(pattern)
        except re.error as exc:
            raise SystemExit(f"--pattern is not a valid regular expression: {exc}") from exc
    rules = load_rules(repo_root)
    rule_id = f"rule_{len(rules) + 1:03d}"
    rule = {"id": rule_id, "title": title, "why": why, "pattern": pattern, "glob": glob,
            "source": source, "added": date.today().isoformat()}
    rules.append({key: value for key, value in rule.items() if value})
    path = _rules_file(repo_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"version": 1, "rules": rules}, indent=2) + "\n", encoding="utf-8")
    return {"ok": True, "rule": rules[-1], "path": RULES_PATH.as_posix()}


def _git(repo_root: Path, args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=repo_root, capture_output=True, text=True, check=False)


def _default_base(repo_root: Path) -> str:
    for ref in ("origin/main", "main", "origin/master", "master"):
        if _git(repo_root, ["rev-parse", "--verify", "--quiet", ref]).returncode == 0:
            return ref
    raise SystemExit("No base to diff against; pass --base REF.")


def added_lines(repo_root: Path, base: str) -> list[tuple[str, int, str]]:
    """(file, line, text) for every line added since `base`, uncommitted and untracked work included."""
    result = _git(repo_root, ["diff", "--unified=0", "--no-color", "--no-ext-diff", base])
    if result.returncode != 0:
        raise SystemExit(f"git diff {base} failed: {result.stderr.strip()}")
    found: list[tuple[str, int, str]] = []
    current, line_no = None, 0
    for line in result.stdout.splitlines():
        if line.startswith("+++ "):
            current = None if line.endswith("/dev/null") else line[6:] if line.startswith("+++ b/") else line[4:]
        elif line.startswith("@@"):
            match = re.search(r"\+(\d+)", line)
            line_no = int(match.group(1)) if match else 0
        elif line.startswith("+") and current:
            found.append((current, line_no, line[1:]))
            line_no += 1
    # A file not added to git yet is all new lines, and `git diff` does not see it.
    for path in _git(repo_root, ["ls-files", "--others", "--exclude-standard"]).stdout.splitlines():
        try:
            text = (repo_root / path).read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        found.extend((path, number, content) for number, content in enumerate(text.splitlines(), 1))
    return found


def check(repo_root: Path, base: str | None = None) -> dict[str, object]:
    base = base or _default_base(repo_root)
    merge_base = _git(repo_root, ["merge-base", base, "HEAD"]).stdout.strip() or base
    lines = added_lines(repo_root, merge_base)
    hits, manual = [], []
    for rule in load_rules(repo_root):
        if not rule.get("pattern"):
            manual.append(rule)
            continue
        pattern = re.compile(rule["pattern"])
        glob = rule.get("glob")
        for path, line_no, text in lines:
            if path.startswith(RULES_PATH.parent.as_posix()):
                continue
            if glob and not fnmatch.fnmatch(path, glob):
                continue
            if pattern.search(text):
                hits.append({"rule": rule["id"], "title": rule["title"], "path": path, "line": line_no, "text": text.strip()})
    return {"ok": not hits, "base": base, "added_lines": len(lines), "hits": hits, "manual": manual}


def _render_check(payload: dict[str, object]) -> str:
    lines = [f"Review rules: {len(payload['hits'])} hit(s) in {payload['added_lines']} added line(s) since {payload['base']}"]
    for hit in payload["hits"]:  # type: ignore[union-attr]
        lines.append(f"- {hit['path']}:{hit['line']} [{hit['rule']}] {hit['title']}\n    {hit['text']}")
    if payload["manual"]:
        lines.append("Check by hand:")
        lines.extend(f"- [{rule['id']}] {rule['title']}" + (f" ({rule['why']})" if rule.get("why") else "")
                     for rule in payload["manual"])  # type: ignore[union-attr]
    return "\n".join(lines)


def _gh(args: list[str], repo_root: Path) -> str:
    result = subprocess.run(["gh", "api", *args], cwd=repo_root, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise SystemExit(f"gh api {args[0]} failed: {result.stderr.strip() or 'is gh installed and logged in?'}")
    return result.stdout


def _gh_items(path: str, repo_root: Path) -> list[dict]:
    """Every item of a paginated list endpoint, one JSON object per line from gh."""
    return [json.loads(line) for line in _gh([path, "--paginate", "--jq", ".[]"], repo_root).splitlines() if line.strip()]


def import_comments(repo_root: Path, pr: int, repo: str | None = None) -> dict[str, object]:
    """Review comments of a pull request, each with the `review add` command it could become."""
    base = f"repos/{repo or '{owner}/{repo}'}/pulls/{pr}"
    author = (json.loads(_gh([base], repo_root)).get("user") or {}).get("login")
    comments = [(c.get("user") or {}, c.get("body") or "", c.get("path"), c.get("line") or c.get("original_line"))
                for c in _gh_items(f"{base}/comments", repo_root)]
    comments += [(r.get("user") or {}, r.get("body") or "", None, None) for r in _gh_items(f"{base}/reviews", repo_root)]
    proposals = []
    for user, body, path, line in comments:
        login = user.get("login") or "?"
        if not body.strip() or login == author or user.get("type") == "Bot" or login.endswith("[bot]"):
            continue
        title = body.strip().splitlines()[0][:100]
        glob = f"*{Path(path).suffix}" if path and Path(path).suffix else ""
        command = ["logics-manager", "review", "add", "--title", title, "--source", f"PR #{pr} ({login})"]
        if glob:
            command += ["--glob", glob]
        proposals.append({"author": login, "path": path, "line": line, "comment": body.strip(),
                          "command": " ".join(shlex.quote(part) for part in command)})
    return {"ok": True, "pr": pr, "author": author, "proposals": proposals}


def _render_import(payload: dict[str, object]) -> str:
    proposals = payload["proposals"]
    if not proposals:
        return f"PR #{payload['pr']}: no review comment from someone other than its author."
    lines = [f"PR #{payload['pr']}: {len(proposals)} review comment(s). Turn the ones that will come back into rules"
             " (add --pattern when a regex can find it, edit the title to say the rule):"]
    for item in proposals:  # type: ignore[union-attr]
        where = f"{item['path']}:{item['line']} " if item["path"] else ""
        lines.append(f"\n- {where}{item['author']}: {item['comment'].splitlines()[0][:160]}\n  {item['command']}")
    return "\n".join(lines)


def _render_list(rules: list[dict[str, str]]) -> str:
    if not rules:
        return f"No review rules yet ({RULES_PATH.as_posix()}). Add one with `logics-manager review add --title ...`."
    lines = [f"Review rules ({len(rules)}):"]
    for rule in rules:
        how = f"pattern `{rule['pattern']}`" + (f" in {rule['glob']}" if rule.get("glob") else "") if rule.get("pattern") else "manual"
        lines.append(f"- [{rule['id']}] {rule['title']} — {how}" + (f" — from {rule['source']}" if rule.get("source") else ""))
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    argv = list(argv or [])
    if not argv or argv[0] in {"-h", "--help"} or argv[0] not in {"add", "list", "check", "import"}:
        print(colorize_help(HELP))
        return 0 if argv and argv[0] in {"-h", "--help"} else 1
    parser = argparse.ArgumentParser(prog=f"logics-manager review {argv[0]}")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    if argv[0] == "add":
        parser.add_argument("--title", required=True)
        for flag in ("--why", "--pattern", "--glob", "--source"):
            parser.add_argument(flag, default="")
    if argv[0] == "check":
        parser.add_argument("--base")
    if argv[0] == "import":
        parser.add_argument("--pr", type=int, required=True)
        parser.add_argument("--repo")
    parsed = parser.parse_args(argv[1:])
    repo_root = find_repo_root(Path.cwd())
    if argv[0] == "add":
        payload = add_rule(repo_root, title=parsed.title, why=parsed.why, pattern=parsed.pattern,
                           glob=parsed.glob, source=parsed.source)
        print(render_payload(payload, parsed.format, lambda: f"Added {payload['rule']['id']} to {payload['path']}"))
        return 0
    if argv[0] == "import":
        payload = import_comments(repo_root, parsed.pr, parsed.repo)
        print(render_payload(payload, parsed.format, lambda: _render_import(payload)))
        return 0
    if argv[0] == "list":
        rules = load_rules(repo_root)
        print(render_payload({"ok": True, "rules": rules}, parsed.format, lambda: _render_list(rules)))
        return 0
    payload = check(repo_root, parsed.base)
    print(render_payload(payload, parsed.format, lambda: _render_check(payload)))
    return 0 if payload["ok"] else 1
