#!/usr/bin/env python3
"""Create a reviewable Logics request from one explicitly triaged GitHub issue."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path


def main() -> None:
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
    issue = event["issue"]
    number = int(issue["number"])
    url = str(issue["html_url"])
    title = str(issue["title"]).strip()
    body = str(issue.get("body") or "").strip()
    branch = f"logics/issue-{number}"
    args = {
        "title": f"GitHub issue #{number}: {title}",
        "needs": [title],
        "context": [f"Untrusted source issue: {url}", body or "No issue body provided."],
        "acceptance_criteria": ["The issue is triaged into a bounded Logics workflow before implementation."],
        "theme": "GitHub issue intake",
        "complexity": "Medium",
        "origin": "github",
        "external_url": url,
        "external_id": f"#{number}",
        "actor": str(issue["user"]["login"]),
    }
    subprocess.run(["git", "checkout", "-b", branch], check=True)
    created = subprocess.run(["python", "-m", "logics_manager", "mcp", "call", "create_request", "--arguments", json.dumps(args)], check=True, text=True, capture_output=True)
    payload = json.loads(created.stdout)
    subprocess.run(["git", "add", str(payload["path"])], check=True)
    subprocess.run(["git", "config", "user.name", "github-actions[bot]"], check=True)
    subprocess.run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], check=True)
    subprocess.run(["git", "commit", "-m", f"docs(logics): triage issue #{number}"], check=True)
    subprocess.run(["git", "push", "origin", branch], check=True)
    pr = subprocess.run(["gh", "pr", "create", "--base", event["repository"]["default_branch"], "--head", branch, "--title", f"docs(logics): triage issue #{number}", "--body", f"Creates `{payload['ref']}` from {url}. Review before merging or promoting work."], check=True, text=True, capture_output=True)
    subprocess.run(["gh", "issue", "comment", str(number), "--body", f"Created Logics request `{payload['ref']}` for review: {pr.stdout.strip()}"], check=True)


if __name__ == "__main__":
    main()
