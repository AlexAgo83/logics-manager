from __future__ import annotations

import argparse
import json
import re
import subprocess
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from .config import find_repo_root
from .doc_parsing import extract_refs, indicator_value, section_lines
from .obsidian import validate_frontmatter_file
from .statuses import stage_statuses


_WORKFLOW_MUTABLE = ("Status", "Progress", "Understanding", "Confidence", "Theme", "Complexity")
_COMPANION_MUTABLE = ("Status", "Related request", "Related backlog", "Related task", "Related product", "Related architecture")


@dataclass(frozen=True)
class Kind:
    directory: str
    prefixes: tuple[str, ...]
    requires_progress: bool
    required_indicators: tuple[str, ...]
    allowed_statuses: tuple[str, ...]
    # What `sync update-indicators` may write on this kind. Distinct from
    # `required_indicators`: Theme is mutable on a task without being required,
    # and Understanding is required on a request but meaningless on a roadmap.
    # Declared here so the mutation path and the linter cannot drift apart.
    mutable_indicators: tuple[str, ...] = _WORKFLOW_MUTABLE


KINDS = {
    "request": Kind("logics/request", ("req",), False, ("From version", "Understanding", "Confidence"), stage_statuses("request")),
    "backlog": Kind("logics/backlog", ("item",), True, ("From version", "Understanding", "Confidence", "Progress"), stage_statuses("backlog")),
    "task": Kind("logics/tasks", ("task",), True, ("From version", "Understanding", "Confidence", "Progress"), stage_statuses("task")),
    "product": Kind("logics/product", ("prod",), False, ("Date", "Status", "Related request", "Related backlog", "Related task", "Related architecture", "Reminder"), stage_statuses("product"), _COMPANION_MUTABLE),
    "roadmap": Kind("logics/roadmap", ("road",), False, ("Date", "Status", "Related product", "Related request", "Reminder"), stage_statuses("roadmap"), _COMPANION_MUTABLE),
    "architecture": Kind("logics/architecture", ("adr",), False, ("Date", "Status", "Drivers", "Related request", "Related backlog", "Related task", "Reminder"), stage_statuses("architecture"), _COMPANION_MUTABLE),
    "spec": Kind("logics/specs", ("spec", "req"), False, ("From version", "Status", "Understanding", "Confidence"), stage_statuses("spec")),
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
MERMAID_LABEL_MAX_WORDS = 6
MERMAID_LABEL_MAX_CHARS = 42
MERMAID_FALLBACKS = {
    "request_backlog": "Backlog slice",
    "backlog_task": "Execution task",
    "task_report": "Done report",
}
REF_PREFIXES = {
    "request": "req",
    "backlog": "item",
    "task": "task",
}
MERMAID_BLOCK_PATTERN = re.compile(r"```mermaid\s*\n(.*?)\n```", re.DOTALL)
MERMAID_SIGNATURE_PATTERN = re.compile(r"^\s*%%\s*logics-signature:\s*(.+?)\s*$", re.MULTILINE)
AI_CONTEXT_FIELD_PATTERN = re.compile(r"^\s*-\s*([^:]+)\s*:\s*(.+?)\s*$")
AI_KEYWORD_STOPWORDS = {
    "about",
    "after",
    "before",
    "being",
    "between",
    "define",
    "deliver",
    "delivery",
    "focus",
    "from",
    "have",
    "into",
    "needs",
    "review",
    "scope",
    "should",
    "task",
    "that",
    "this",
    "through",
    "when",
    "with",
}


def _read_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8").splitlines()


def _extract_first_heading(lines: list[str]) -> str | None:
    for line in lines:
        if line.startswith("## "):
            return line
    return None


_indicator_value = indicator_value
_section_lines = section_lines
_extract_refs = extract_refs


def _has_indicator(lines: list[str], key: str) -> bool:
    return _indicator_value(lines, key) is not None


def _strip_mermaid_blocks(text: str) -> str:
    return MERMAID_BLOCK_PATTERN.sub("", text)


def _plain_text(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"`+", "", text)
    text = text.replace("&", " and ")
    text = re.sub(r"[/{}[\]()+*#]", " ", text)
    text = re.sub(r"[^A-Za-z0-9:._ -]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip(" .:-")
    return text


def _safe_mermaid_label(value: str, fallback: str) -> str:
    text = _plain_text(value)
    if not text:
        text = fallback
    words = text.split()
    if len(words) > MERMAID_LABEL_MAX_WORDS:
        text = " ".join(words[:MERMAID_LABEL_MAX_WORDS])
    if len(text) > MERMAID_LABEL_MAX_CHARS:
        text = text[:MERMAID_LABEL_MAX_CHARS].rstrip(" .:-")
    return text or fallback


def _rendered_list_items(text: str) -> list[str]:
    items: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        stripped = re.sub(r"^- \[[ xX]\]\s*", "", stripped)
        if stripped.startswith("- "):
            stripped = stripped[2:].strip()
        items.append(stripped)
    return items


def _pick_mermaid_summary(candidates: list[str], fallback: str) -> str:
    for candidate in candidates:
        label = _safe_mermaid_label(candidate, "")
        if label:
            return label
    return fallback


def _mermaid_signature_part(value: str) -> str:
    text = _plain_text(value).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:40]


def _compose_mermaid_signature(kind_name: str, *parts: str) -> str:
    signature_parts = [_mermaid_signature_part(kind_name)]
    for part in parts:
        rendered = _mermaid_signature_part(part)
        if rendered:
            signature_parts.append(rendered)
    return "|".join(signature_parts)


def _extract_title(lines: list[str]) -> str:
    for line in lines:
        if line.startswith("## "):
            match = re.match(r"^##\s+\S+\s*-\s*(.+?)\s*$", line)
            if match:
                return match.group(1).strip()
            return line.removeprefix("## ").strip()
    return ""


def _section_block(text: str, heading: str, fallback: str = "") -> str:
    cleaned = [line.rstrip() for line in _section_lines(text.splitlines(), heading) if line.strip()]
    if cleaned:
        return "\n".join(cleaned)
    return fallback


def _ref_placeholder(text: str, prefix: str, fallback: str = "(none yet)") -> str:
    refs = sorted(_extract_refs(text, prefix))
    if refs:
        return ", ".join(f"`{ref}`" for ref in refs)
    return fallback


def _workflow_mermaid_values_from_doc(text: str, kind_name: str) -> dict[str, str]:
    ref_text = _strip_mermaid_blocks(text)
    if kind_name == "request":
        return {
            "NEEDS_PLACEHOLDER": _section_block(text, "Needs", "- Describe the need"),
            "CONTEXT_PLACEHOLDER": _section_block(text, "Context", "- Add the relevant context"),
            "ACCEPTANCE_PLACEHOLDER": _section_block(text, "Acceptance criteria", "- AC1: Define a measurable outcome"),
        }

    if kind_name == "backlog":
        return {
            "PROBLEM_PLACEHOLDER": _section_block(text, "Problem", "- Describe the problem and user impact"),
            "ACCEPTANCE_BLOCK": _section_block(text, "Acceptance criteria", "- AC1: Define an objective acceptance check"),
            "REQUEST_LINK_PLACEHOLDER": _ref_placeholder(ref_text, REF_PREFIXES["request"]),
            "TASK_LINK_PLACEHOLDER": _ref_placeholder(ref_text, REF_PREFIXES["task"]),
        }

    if kind_name == "task":
        return {
            "PLAN_BLOCK": _section_block(
                text,
                "Plan",
                "- [ ] 1. Confirm scope\n- [ ] 2. Implement scope\n- [ ] 3. Validate result",
            ),
            "VALIDATION_BLOCK": _section_block(
                text,
                "Validation",
                "- Run the relevant automated tests before closing the current wave or step.",
            ),
            "BACKLOG_LINK_PLACEHOLDER": _ref_placeholder(
                ref_text,
                REF_PREFIXES["backlog"],
                "(add: Derived from `logics/backlog/item_XXX_...`)",
            ),
        }

    raise ValueError(f"Unsupported Mermaid workflow kind: {kind_name}")


def _render_request_mermaid(title: str, values: dict[str, str]) -> str:
    need_items = _rendered_list_items(values.get("NEEDS_PLACEHOLDER", ""))
    context_items = _rendered_list_items(values.get("CONTEXT_PLACEHOLDER", ""))
    acceptance_items = _rendered_list_items(values.get("ACCEPTANCE_PLACEHOLDER", ""))
    title_label = _safe_mermaid_label(title, "Request need")
    need_label = _pick_mermaid_summary([*need_items, *context_items, title], "Need scope")
    outcome_label = _pick_mermaid_summary([*acceptance_items, *context_items], "Acceptance target")
    feedback_label = _safe_mermaid_label(MERMAID_FALLBACKS["request_backlog"], MERMAID_FALLBACKS["request_backlog"])
    signature = _compose_mermaid_signature("request", title, need_label, outcome_label)
    return "\n".join(
        [
            "```mermaid",
            "%% logics-kind: request",
            f"%% logics-signature: {signature}",
            "flowchart TD",
            f"    Trigger[{title_label}] --> Need[{need_label}]",
            f"    Need --> Outcome[{outcome_label}]",
            f"    Outcome --> Backlog[{feedback_label}]",
            "```",
        ]
    )


def _render_backlog_mermaid(title: str, values: dict[str, str]) -> str:
    request_refs = _extract_refs(values.get("REQUEST_LINK_PLACEHOLDER", ""), REF_PREFIXES["request"])
    task_refs = _extract_refs(values.get("TASK_LINK_PLACEHOLDER", ""), REF_PREFIXES["task"])
    problem_items = _rendered_list_items(values.get("PROBLEM_PLACEHOLDER", ""))
    acceptance_items = _rendered_list_items(values.get("ACCEPTANCE_BLOCK", ""))
    source_label = _pick_mermaid_summary([*request_refs, title], "Request source")
    problem_label = _pick_mermaid_summary([*problem_items, title], "Problem scope")
    scope_label = _safe_mermaid_label(title, "Scoped delivery")
    acceptance_label = _pick_mermaid_summary(acceptance_items, "Acceptance check")
    task_label = _pick_mermaid_summary(task_refs, MERMAID_FALLBACKS["backlog_task"])
    signature = _compose_mermaid_signature("backlog", title, source_label, problem_label, acceptance_label)
    return "\n".join(
        [
            "```mermaid",
            "%% logics-kind: backlog",
            f"%% logics-signature: {signature}",
            "flowchart TD",
            f"    Request[{source_label}] --> Problem[{problem_label}]",
            f"    Problem --> Scope[{scope_label}]",
            f"    Scope --> Acceptance[{acceptance_label}]",
            f"    Acceptance --> Tasks[{task_label}]",
            "```",
        ]
    )


def _render_task_mermaid(title: str, values: dict[str, str]) -> str:
    backlog_refs = _extract_refs(values.get("BACKLOG_LINK_PLACEHOLDER", ""), REF_PREFIXES["backlog"])
    plan_items = [
        item
        for item in _rendered_list_items(values.get("PLAN_BLOCK", ""))
        if not item.lower().startswith("final:")
    ]
    validation_items = _rendered_list_items(values.get("VALIDATION_BLOCK", ""))
    source_label = _pick_mermaid_summary([*backlog_refs, title], "Backlog source")
    step_one = _pick_mermaid_summary(plan_items[:1], "Confirm scope")
    step_two = _pick_mermaid_summary(plan_items[1:2], "Implement change")
    step_three = _pick_mermaid_summary(plan_items[2:3], "Validate result")
    validation_label = _pick_mermaid_summary(validation_items, "Validation")
    report_label = _safe_mermaid_label(MERMAID_FALLBACKS["task_report"], MERMAID_FALLBACKS["task_report"])
    signature = _compose_mermaid_signature("task", title, source_label, step_one, validation_label)
    return "\n".join(
        [
            "```mermaid",
            "%% logics-kind: task",
            f"%% logics-signature: {signature}",
            "stateDiagram-v2",
            f'    state "{source_label}" as Backlog',
            f'    state "{step_one}" as Scope',
            f'    state "{step_two}" as Build',
            f'    state "{step_three}" as Verify',
            f'    state "{validation_label}" as Validation',
            f'    state "{report_label}" as Report',
            "    [*] --> Backlog",
            "    Backlog --> Scope",
            "    Scope --> Build",
            "    Build --> Verify",
            "    Verify --> Validation",
            "    Validation --> Report",
            "    Report --> [*]",
            "```",
        ]
    )


def expected_workflow_mermaid_signature(kind_name: str, lines: list[str]) -> str:
    text = "\n".join(lines)
    title = _extract_title(lines)
    if not title:
        return ""
    values = _workflow_mermaid_values_from_doc(text, kind_name)
    if kind_name == "request":
        rendered = _render_request_mermaid(title, values)
    elif kind_name == "backlog":
        rendered = _render_backlog_mermaid(title, values)
    elif kind_name == "task":
        rendered = _render_task_mermaid(title, values)
    else:
        return ""
    match = MERMAID_SIGNATURE_PATTERN.search(rendered)
    return match.group(1) if match is not None else ""


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


REVIEWED_INDICATOR = "Indicators reviewed"
NUMERIC_INDICATORS = {"Progress", "Understanding", "Confidence"}
MUTABLE_INDICATOR_FLAGS = {
    "Status": "status",
    "Progress": "progress",
    "Understanding": "understanding",
    "Confidence": "confidence",
    "Theme": "theme",
    "Complexity": "complexity",
}


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
        return []
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
    allowed_prefixes = "|".join(re.escape(prefix) for prefix in kind.prefixes)
    if not re.match(rf"^({allowed_prefixes})_\d{{3}}_[a-z0-9_]+\.md$", name):
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

    for warning in validate_frontmatter_file(path, kind_name):
        issues.append(warning)

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
            if path.name == "README.md":
                continue
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
                    # `Indicators reviewed` is the honest exit: the author confirms the
                    # values were reconsidered and did not move. Without it the only
                    # satisfiable exit for a kind that declares no numeric indicator was
                    # to label a semantic edit non-semantic.
                    not _diff_has_indicator_changes(repo_root, rel_path, required | {REVIEWED_INDICATOR})
                    and not _diff_is_status_only_normalization(repo_root, rel_path)
                    and not _has_non_semantic_edit_marker(_read_lines(path))
                ):
                    mutable = [key for key in MUTABLE_INDICATOR_FLAGS if key in required]
                    flags = " ".join(
                        f"--{MUTABLE_INDICATOR_FLAGS[key]} {'<n>' if key in NUMERIC_INDICATORS else '<value>'}"
                        for key in mutable
                    )
                    remedy = f"logics-manager sync update-indicators {path.stem} {flags}".strip()
                    issues.append(
                        "modified without updating indicators: "
                        + ", ".join(sorted(required))
                        + (f" (fix: {remedy}; " if mutable else " (fix: ")
                        + f"or `logics-manager sync update-indicators {path.stem} --touch` "
                        + "if the values were reviewed and did not change; "
                        + "or add `> Non-semantic edit:` for intentionally non-semantic edits)"
                    )
            if issues:
                all_issues.append((rel_path, issues))
            if warnings:
                all_warnings.append((rel_path, warnings))

    issues = [{"path": path.as_posix(), "message": issue, "severity": "blocking"} for path, issues in all_issues for issue in issues]
    warnings: list[dict[str, str]] = []
    for path, path_warnings in all_warnings:
        for warning in path_warnings:
            item = {"path": path.as_posix(), "message": warning, "severity": "warning"}
            if "Mermaid context signature" in warning:
                item["repair_command"] = "logics-manager sync refresh-mermaid-signatures"
            warnings.append(item)
    return {
        "ok": not issues,
        "can_continue": not issues,
        "release_ready": not issues and not warnings,
        "issue_count": len(issues),
        "warning_count": len(warnings),
        "strict_count": 0,
        "finding_count": len(issues) + len(warnings),
        "issues": issues,
        "warnings": warnings,
        "strict": [],
        "findings": [*issues, *warnings],
    }


def render_lint(repo_root: Path, *, require_status: bool = False, output_format: str = "text") -> str:
    payload = lint_payload(repo_root, require_status=require_status)
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)
    if not payload["issues"] and not payload["warnings"]:
        return "Logics lint: OK"
    if not payload["issues"]:
        lines = ["Logics lint: OK (warnings)", f"Blocking issues: {payload['issue_count']}; warnings: {payload['warning_count']}"]
        for warning in payload["warnings"]:
            lines.append(f"- {warning['path']}: WARNING: {warning['message']}")
        return "\n".join(lines)
    lines = ["Logics lint: FAILED", f"Blocking issues: {payload['issue_count']}; warnings: {payload['warning_count']}"]
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
