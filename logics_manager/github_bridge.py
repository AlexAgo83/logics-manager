"""Where the corpus and the issue tracker disagree, and telling issues what shipped
(item_834/item_837/item_838).

Reads issue *state* only -- number, open or closed, labels -- never a body: issue
content is untrusted, and this bridge must never let one influence its output or what
it decides to post. Asked for, not polled: this does not join the viewer's auto-refresh
tick (req_373 measured that cost and exists to bring it down), since reconciliation
changes on the scale of a delivery, not every 15 seconds.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from typing import Any

from .provenance import all_request_provenance, issue_number, request_issue_urls

_GITHUB_REMOTE = re.compile(r"github\.com[:/](?P<owner>[^/\s]+)/(?P<repo>[^/\s]+?)(?:\.git)?(?=/?(?:\s|$))")

#: Terminal statuses: a request in one of these no longer needs its issues open.
_SETTLED_STATUSES = {"done", "declined", "archived", "withdrawn", "superseded"}

#: The exact lifecycle vocabulary .github/workflows/logics-issue-update.yml already
#: uses -- item_837 reuses it rather than inventing a second one.
LIFECYCLE_STATES = ("accepted", "in-progress", "delivered", "declined")

#: Settled statuses that item_837's closeout notice can actually post a label for.
#: An issue already carrying that label has been told -- closing it afterwards is a
#: human act (item_837's own scope), so it is no longer a disagreement to flag.
_SETTLED_STATUS_LABEL = {"done": "logics:delivered", "declined": "logics:declined"}


def _owner_repo(repo_root: Path, *, runner: Any | None = None) -> tuple[str, str] | None:
    # `git remote -v`, not `get-url origin`: a remote is not always named origin (this
    # repo's own is "logics-manager"), and -v lists every remote regardless of name.
    git_runner = runner or subprocess.run
    try:
        result = git_runner(["git", "remote", "-v"], cwd=repo_root, text=True, capture_output=True, timeout=5)
    except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
        return None
    if result.returncode != 0:
        return None
    for line in result.stdout.splitlines():
        match = _GITHUB_REMOTE.search(line.strip())
        if match:
            return match.group("owner"), match.group("repo")
    return None


def _run_gh(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    gh_runner = runner or subprocess.run
    return gh_runner(["gh", *args], cwd=repo_root, text=True, capture_output=True, stdin=subprocess.DEVNULL, timeout=15)


def _unreachable(message: str) -> dict[str, Any]:
    # item_834 AC2: says the tracker could not be read, rather than reporting that
    # nothing is wrong -- an empty report and an unreachable tracker must never look
    # the same.
    return {"ok": False, "reachable": False, "message": message}


def _request_status(repo_root: Path, ref: str) -> str:
    from .sync import parse_workflow_doc

    path = repo_root / "logics" / "request" / f"{ref}.md"
    try:
        return str(parse_workflow_doc(path, repo_root=repo_root).indicators.get("Status", "")).strip()
    except (OSError, ValueError):
        return ""


def reconciliation_report_payload(repo_root: Path, *, git_runner: Any | None = None, gh_runner: Any | None = None) -> dict[str, Any]:
    """item_834: the three questions, answered from tracker + corpus state only.

    AC1: each disagreement named separately, with issue numbers and Logics refs.
    AC2: a tracker that cannot be read says so, rather than reporting nothing wrong.
    AC3: only issue number/state/labels are read -- never a body.
    """
    owner_repo = _owner_repo(repo_root, runner=git_runner)
    if owner_repo is None:
        return _unreachable("No GitHub remote could be determined for this repository.")
    owner, repo = owner_repo
    try:
        result = _run_gh(
            repo_root,
            ["issue", "list", "--repo", f"{owner}/{repo}", "--state", "all", "--limit", "500", "--json", "number,state,labels,url"],
            runner=gh_runner,
        )
    except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired) as exc:
        return _unreachable(f"Could not read the issue tracker: {exc}")
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip().splitlines()
        return _unreachable(detail[0] if detail else "`gh issue list` failed.")
    try:
        issues = json.loads(result.stdout or "[]")
    except json.JSONDecodeError:
        return _unreachable("`gh issue list` returned invalid JSON.")
    if not isinstance(issues, list):
        return _unreachable("`gh issue list` returned an unexpected shape.")

    issue_requests: dict[str, list[str]] = {}
    for ref, urls in all_request_provenance(repo_root).items():
        for url in urls:
            number = issue_number(url)
            if number:
                issue_requests.setdefault(number, []).append(ref)

    open_no_request: list[dict[str, Any]] = []
    done_with_open_issue: list[dict[str, Any]] = []
    closed_with_open_request: list[dict[str, Any]] = []
    for issue in issues:
        if not isinstance(issue, dict):
            continue
        number = str(issue.get("number") or "")
        state = str(issue.get("state") or "").upper()
        url = str(issue.get("url") or "")
        labels = {str(label.get("name") or "") for label in issue.get("labels", []) if isinstance(label, dict)}
        refs = issue_requests.get(number, [])
        if state == "OPEN" and not refs:
            open_no_request.append({"issue": number, "url": url})
        for ref in refs:
            status = _request_status(repo_root, ref).lower()
            already_told = _SETTLED_STATUS_LABEL.get(status) in labels
            if state == "OPEN" and status in _SETTLED_STATUSES and not already_told:
                done_with_open_issue.append({"issue": number, "url": url, "request": ref, "request_status": status})
            if state == "CLOSED" and status not in _SETTLED_STATUSES:
                closed_with_open_request.append({"issue": number, "url": url, "request": ref, "request_status": status})

    return {
        "ok": True,
        "reachable": True,
        "open_issues_with_no_request": open_no_request,
        "done_requests_with_open_issues": done_with_open_issue,
        "closed_issues_with_open_request": closed_with_open_request,
    }


def closeout_notice_payload(
    repo_root: Path,
    request_ref: str,
    *,
    state: str,
    post: bool = False,
    gh_runner: Any | None = None,
) -> dict[str, Any]:
    """item_837: at closeout, state exactly what would be posted to which issues.

    AC1/AC2: the dry statement (`post=False`) is the default and always returned;
    posting is a second, explicit action, never a side effect of finishing. AC3: the
    label and comment reuse the exact vocabulary and wording
    `.github/workflows/logics-issue-update.yml` already posts, not a second one.
    """
    if state not in LIFECYCLE_STATES:
        raise ValueError(f"Unsupported lifecycle state `{state}`. Expected one of: {', '.join(LIFECYCLE_STATES)}.")
    issue_urls = request_issue_urls(repo_root, f"logics/request/{request_ref}.md")
    notices = [
        {
            "issue_url": url,
            "label": f"logics:{state}",
            "comment": f"Logics lifecycle update: **{state}** — linked workflow: `{request_ref}`.",
        }
        for url in issue_urls
    ]
    if not post or not notices:
        return {"ok": True, "request": request_ref, "state": state, "posted": False, "notices": notices}

    posted_issues: list[str] = []
    errors: list[dict[str, str]] = []
    for notice in notices:
        try:
            label_result = _run_gh(repo_root, ["issue", "edit", notice["issue_url"], "--add-label", notice["label"]], runner=gh_runner)
            comment_result = _run_gh(repo_root, ["issue", "comment", notice["issue_url"], "--body", notice["comment"]], runner=gh_runner)
        except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired) as exc:
            errors.append({"issue_url": notice["issue_url"], "error": str(exc)})
            continue
        failure = label_result if label_result.returncode != 0 else comment_result if comment_result.returncode != 0 else None
        if failure is not None:
            detail = (failure.stderr or failure.stdout or "").strip().splitlines()
            errors.append({"issue_url": notice["issue_url"], "error": detail[0] if detail else "gh issue update failed."})
            continue
        posted_issues.append(notice["issue_url"])
    return {
        "ok": not errors,
        "request": request_ref,
        "state": state,
        "posted": bool(posted_issues),
        "notices": notices,
        "posted_issues": posted_issues,
        "errors": errors,
    }
