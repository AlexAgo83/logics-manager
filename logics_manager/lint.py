from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .config import find_repo_root

FLOW_MANAGER_SCRIPTS = Path(__file__).resolve().parents[1] / "logics" / "skills" / "logics-flow-manager" / "scripts"
if str(FLOW_MANAGER_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(FLOW_MANAGER_SCRIPTS))

from logics_flow_support import expected_workflow_mermaid_signature  # type: ignore  # noqa: E402


@dataclass(frozen=True)
class Kind:
    directory: str
    prefix: str
    requires_progress: bool
    required_indicators: tuple[str, ...]
    allowed_statuses: tuple[str, ...]


KINDS = {
    "request": Kind("logics/request", "req", False, ("From version", "Understanding", "Confidence"), ("Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived")),
    "backlog": Kind("logics/backlog", "item", True, ("From version", "Understanding", "Confidence", "Progress"), ("Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived")),
    "task": Kind("logics/tasks", "task", True, ("From version", "Understanding", "Confidence", "Progress"), ("Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived")),
    "product": Kind("logics/product", "prod", False, ("Date", "Status", "Related request", "Related backlog", "Related task", "Related architecture", "Reminder"), ("Draft", "Proposed", "Active", "Validated", "Rejected", "Superseded", "Archived")),
    "architecture": Kind("logics/architecture", "adr", False, ("Date", "Status", "Drivers", "Related request", "Related backlog", "Related task", "Reminder"), ("Draft", "Proposed", "Accepted", "Rejected", "Superseded", "Archived")),
}

WORKFLOW_KINDS = {"request", "backlog", "task"}
ACTIVE_WORKFLOW_STATUSES = {"ready", "in progress", "done"}
CRITICAL_INDICATOR_PLACEHOLDERS = {
    "From version": {"X.X.X"},
    "Understanding": {"??%"},
    "Confidence": {"??%"},
    "Progress": {"??%"},
}
TEMPLATE_PLACEHOLDER_SNIPPETS = (
    "Describe the need",
    "Add context and constraints",
    "Describe the problem and user impact",
    "Define an objective acceptance check",
    "First implementation step",
    "Second implementation step",
    "Third implementation step",
)
NON_SEMANTIC_EDIT_MARKERS = (
    "> Maintenance edit:",
    "> Non-semantic edit:",
)
BLOCKING_TRACEABILITY_PLACEHOLDER_SNIPPETS = (
    "Proof: TODO",
    "TODO: map this acceptance criterion",
)


def _read_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8").splitlines()


def _extract_first_heading(lines: list[str]) -> str | None:
    for line in lines:
        if line.startswith("## "):
            return line
    return None


def _indicator_value(lines: list[str], key: str) -> str | None:
    pattern = re.compile(rf"^\s*>\s*{re.escape(key)}\s*:\s*(.+)\s*$")
    for line in lines:
        match = pattern.match(line)
        if match:
            return match.group(1).strip()
    return None


def _has_indicator(lines: list[str], key: str) -> bool:
    return _indicator_value(lines, key) is not None


def _section_lines(lines: list[str], heading: str) -> list[str]:
    start_idx = None
    target = heading.strip().lower()
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == target:
            start_idx = idx + 1
            break
    if start_idx is None:
        return []
    out: list[str] = []
    for idx in range(start_idx, len(lines)):
        line = lines[idx]
        if line.startswith("# "):
            break
        out.append(line)
    return out


def _extract_refs(text: str, prefix: str) -> list[str]:
    pattern = re.compile(rf"\b{re.escape(prefix)}_\d{{3}}_[a-z0-9_]+\b")
    return sorted({match.group(0) for match in pattern.finditer(text)})


def _run_git(repo_root: Path, args: list[str]) -> str:
    try:
        result = subprocess.run(["git", *args], cwd=repo_root, check=False, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    except OSError:
        return ""
    if result.returncode != 0:
        return ""
    return result.stdout


def _git_modified_paths(repo_root: Path) -> set[Path]:
    paths: set[Path] = set()
    for args in (
        ["diff", "--name-only", "--diff-filter=ACMRT"],
        ["diff", "--cached", "--name-only", "--diff-filter=ACMRT"],
        ["ls-files", "--others", "--exclude-standard"],
    ):
        for line in _run_git(repo_root, args).splitlines():
            line = line.strip()
            if line:
                paths.add(Path(line))
    if not paths:
        for line in _run_git(repo_root, ["diff-tree", "--no-commit-id", "--name-only", "-r", "--diff-filter=ACMRT", "HEAD"]).splitlines():
            line = line.strip()
            if line:
                paths.add(Path(line))
    return paths


def _git_untracked_paths(repo_root: Path) -> set[Path]:
    paths: set[Path] = set()
    for line in _run_git(repo_root, ["ls-files", "--others", "--exclude-standard"]).splitlines():
        line = line.strip()
        if line:
            paths.add(Path(line))
    return paths


def _doc_diff(repo_root: Path, rel_path: Path) -> str:
    diff = _run_git(repo_root, ["diff", "--unified=0", "--", str(rel_path)])
    diff += _run_git(repo_root, ["diff", "--cached", "--unified=0", "--", str(rel_path)])
    if diff:
        return diff
    if rel_path in _git_modified_paths(repo_root):
        return _run_git(repo_root, ["show", "--format=", "--unified=0", "HEAD", "--", str(rel_path)])
    return ""


def _diff_has_indicator_changes(repo_root: Path, rel_path: Path, indicators: set[str]) -> bool:
    if not indicators:
        return True
    diff = _doc_diff(repo_root, rel_path)
    if not diff:
        return False
    for line in diff.splitlines():
        if not line.startswith(("+", "-")):
            continue
        if line.startswith(("+++ ", "--- ")):
            continue
        for key in indicators:
            if f"> {key}:" in line:
                return True
    return False


def _diff_is_status_only_normalization(repo_root: Path, rel_path: Path) -> bool:
    diff = _doc_diff(repo_root, rel_path)
    if not diff:
        return False
    saw_change = False
    for line in diff.splitlines():
        if not line.startswith(("+", "-")):
            continue
        if line.startswith(("+++ ", "--- ")):
            continue
        changed = line[1:].strip()
        if not changed:
            continue
        saw_change = True
        if changed.startswith("> Status:"):
            continue
        return False
    return saw_change


def _has_non_semantic_edit_marker(lines: list[str]) -> bool:
    text = "\n".join(lines)
    return any(marker in text for marker in NON_SEMANTIC_EDIT_MARKERS)


def _workflow_status_is_active(lines: list[str]) -> bool:
    status_value = _indicator_value(lines, "Status")
    if status_value is None:
        return False
    return " ".join(status_value.split()).lower() in ACTIVE_WORKFLOW_STATUSES


def _blocking_placeholder_hits(lines: list[str]) -> list[str]:
    text = "\n".join(lines)
    hits: list[str] = []
    for snippet in TEMPLATE_PLACEHOLDER_SNIPPETS:
        if snippet in text:
            hits.append(snippet)
    for snippet in BLOCKING_TRACEABILITY_PLACEHOLDER_SNIPPETS:
        if snippet in text:
            hits.append(snippet)
    return sorted(set(hits))


def _mermaid_warnings(kind_name: str, lines: list[str]) -> list[str]:
    text = "\n".join(lines)
    match = re.search(r"```mermaid\s*\n(.*?)\n```", text, flags=re.DOTALL)
    if match is None:
        return ["missing Mermaid overview block"]
    block = match.group(1)
    warnings: list[str] = []
    signature_match = re.search(r"^\s*%%\s*logics-signature:\s*(.+?)\s*$", block, flags=re.MULTILINE)
    expected_signature = expected_workflow_mermaid_signature(kind_name, lines)
    if signature_match is None:
        warnings.append("missing Mermaid context signature comment")
    elif expected_signature and signature_match.group(1).strip() != expected_signature:
        warnings.append(f"Mermaid context signature is stale: expected `{expected_signature}`")
    return warnings


def _lint_file(path: Path, kind_name: str, kind: Kind, require_status: bool, check_changed_doc_rules: bool) -> tuple[list[str], list[str]]:
    issues: list[str] = []
    warnings: list[str] = []
    name = path.name
    if not re.match(rf"^{re.escape(kind.prefix)}_\d{{3}}_[a-z0-9_]+\.md$", name):
        issues.append(f"bad filename: {name}")

    lines = _read_lines(path)
    heading = _extract_first_heading(lines)
    if heading is None:
        issues.append("missing first heading (expected '## ...')")
    else:
        expected_prefix = f"## {path.stem} - "
        if not heading.startswith(expected_prefix):
            issues.append(f"bad heading: expected '{expected_prefix}<Title>'")

    for key in kind.required_indicators:
        if not _has_indicator(lines, key):
            issues.append(f"missing indicator: {key}")

    status_value = _indicator_value(lines, "Status")
    if status_value is None:
        if require_status:
            issues.append("missing indicator: Status")
    elif " ".join(status_value.split()).lower() not in {status.lower() for status in kind.allowed_statuses}:
        issues.append("invalid Status value: " + status_value + " (allowed: " + " | ".join(kind.allowed_statuses) + ")")

    if check_changed_doc_rules and kind_name in WORKFLOW_KINDS:
        for key, disallowed_values in CRITICAL_INDICATOR_PLACEHOLDERS.items():
            if key not in kind.required_indicators:
                continue
            current = _indicator_value(lines, key)
            if current in disallowed_values:
                issues.append(f"placeholder indicator: {key} = {current}")

        text = "\n".join(lines)
        placeholder_hits = [snippet for snippet in TEMPLATE_PLACEHOLDER_SNIPPETS if snippet in text]
        blocking_hits = _blocking_placeholder_hits(lines)
        if _workflow_status_is_active(lines) and blocking_hits:
            issues.append("blocking placeholder content in active workflow doc: " + ", ".join(blocking_hits))
        elif placeholder_hits:
            warnings.append("contains template placeholder content: " + ", ".join(sorted(set(placeholder_hits))))
        warnings.extend(_mermaid_warnings(kind_name, lines))

    return issues, warnings


def lint_payload(repo_root: Path, *, require_status: bool = False) -> dict[str, object]:
    all_issues: list[tuple[Path, list[str]]] = []
    all_warnings: list[tuple[Path, list[str]]] = []
    modified_paths = _git_modified_paths(repo_root)
    untracked_paths = _git_untracked_paths(repo_root)

    for kind_name, kind in KINDS.items():
        directory = repo_root / kind.directory
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.md")):
            rel_path = path.relative_to(repo_root)
            issues, warnings = _lint_file(
                path,
                kind_name,
                kind,
                require_status=require_status,
                check_changed_doc_rules=rel_path in modified_paths,
            )
            if rel_path in modified_paths and rel_path not in untracked_paths:
                required = set(kind.required_indicators)
                if (
                    not _diff_has_indicator_changes(repo_root, rel_path, required)
                    and not _diff_is_status_only_normalization(repo_root, rel_path)
                    and not _has_non_semantic_edit_marker(_read_lines(path))
                ):
                    issues.append("modified without updating indicators: " + ", ".join(sorted(required)))
            if issues:
                all_issues.append((rel_path, issues))
            if warnings:
                all_warnings.append((rel_path, warnings))

    return {
        "ok": not all_issues,
        "issue_count": sum(len(issues) for _path, issues in all_issues),
        "warning_count": sum(len(warnings) for _path, warnings in all_warnings),
        "issues": [{"path": path.as_posix(), "message": issue} for path, issues in all_issues for issue in issues],
        "warnings": [{"path": path.as_posix(), "message": warning} for path, warnings in all_warnings for warning in warnings],
    }


def render_lint(repo_root: Path, *, require_status: bool = False, output_format: str = "text") -> str:
    payload = lint_payload(repo_root, require_status=require_status)
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)
    if not payload["issues"] and not payload["warnings"]:
        return "Logics lint: OK"
    if not payload["issues"]:
        lines = ["Logics lint: OK (warnings)"]
        for warning in payload["warnings"]:
            lines.append(f"- {warning['path']}: WARNING: {warning['message']}")
        return "\n".join(lines)
    lines = ["Logics lint: FAILED"]
    for issue in payload["issues"]:
        lines.append(f"- {issue['path']}: {issue['message']}")
    for warning in payload["warnings"]:
        lines.append(f"- {warning['path']}: WARNING: {warning['message']}")
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="logics-manager lint", description="Lint Logics docs (filenames, headings, indicators).")
    parser.add_argument("--require-status", action="store_true", help="Require `Status` indicator in all supported Logics docs.")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    return parser


def main(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    repo_root = find_repo_root(Path.cwd())
    output = render_lint(repo_root, require_status=args.require_status, output_format=args.format)
    print(output)
    payload = lint_payload(repo_root, require_status=args.require_status)
    return 0 if not payload["issues"] else 1
