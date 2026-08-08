"""The document vocabulary the flow verbs are written in.

Lifted out of ``flow/__init__.py`` by req_311. The verbs sit on top of these primitives --
resolving a ref to a path, reading and rewriting an indicator line, walking a section's
checkboxes -- and nothing here knows a verb exists, so the dependency runs one way and no
import proxy is needed. Every name is re-exported from ``logics_manager.flow``, so callers
and tests import exactly what they imported before.
"""

from __future__ import annotations

from __future__ import annotations
import argparse
import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from ..audit import audit_payload
from ..cli_output import print_payload
from ..config import ConfigError, find_repo_root
from ..doc_parsing import extract_refs, progress_value, section_lines
from ..flow_evidence import has_ac_proof as _has_ac_proof
from ..flow_evidence import has_validation_evidence as _has_validation_evidence
from ..flow_evidence import structured_validation_line as _structured_validation_line
from ..index import index_payload
from ..lint import expected_workflow_mermaid_signature, lint_payload
from ..path_utils import ensure_relative_to, resolve_repo_output_path
from ..statuses import transition_error
from ..sync import build_context_pack_payload, read_logics_doc_payload
from ..termstyle import colorize_help
from .scaffold_docs import (  # noqa: F401  (re-exported for the rest of the package)
    _next_product_ref,
    _resolved_from_version,
    _slugify,
    _string_list,
    _string_value,
    _bullets_or_default,
    _normalize_ac_id,
    _build_scaffold_request_doc,
    _build_scaffold_product_doc,
    _build_scaffold_backlog_doc,
    _scaffold_input_request_ac_ids,
    _scaffold_ac_ownership,
    _scaffold_task_ac_trace,
    _build_scaffold_task_doc,
    _build_split_orchestration_task_doc,
)
import os


@dataclass(frozen=True)
class DocKind:
    kind: str
    directory: str
    prefix: str
    include_progress: bool


@dataclass(frozen=True)
class PlannedDoc:
    ref: str
    path: Path


DOC_KINDS = {
    "request": DocKind("request", "logics/request", "req", False),
    "backlog": DocKind("backlog", "logics/backlog", "item", True),
    "task": DocKind("task", "logics/tasks", "task", True),
}


STATUS_BY_KIND_DEFAULT = {
    "request": "Draft",
    "backlog": "Ready",
    "task": "Ready",
}


LIST_KIND_CHOICES = ("all", "request", "backlog", "task")


ACTIVE_FLOW_STATUSES = {"draft", "ready", "in progress", "blocked"}


FLOW_KIND_ORDER = {"request": 0, "backlog": 1, "task": 2}


_section_lines = section_lines


def _normalize_status(value: str | None) -> str:
    return " ".join(value.split()).lower() if value else ""


def _is_active_flow_doc(status: str | None) -> bool:
    return _normalize_status(status) in ACTIVE_FLOW_STATUSES


@dataclass(frozen=True)
class FlowListEntry:
    kind: str
    path: Path
    ref: str
    title: str
    status: str | None
    owner: str | None
    progress: str | None


def _parse_flow_doc(path: Path, kind: str) -> FlowListEntry:
    lines = path.read_text(encoding="utf-8").splitlines()
    ref = path.stem
    title = _extract_doc_title(path)
    status: str | None = None
    owner: str | None = None
    progress: str | None = None

    for line in lines:
        if line.startswith("> Status:"):
            status = line.split(":", 1)[1].strip()
            continue
        if line.startswith("> Owner:"):
            owner = line.split(":", 1)[1].strip()
            continue
        if line.startswith("> Progress:"):
            progress = line.split(":", 1)[1].strip()

    return FlowListEntry(
        kind=kind,
        path=path,
        ref=ref,
        title=title,
        status=status,
        owner=owner,
        progress=progress,
    )


def _build_help() -> str:
    return "\n".join(
        [
            "Logics Flow CLI",
            "Create workflow docs with stable IDs, templates, and transitions.",
            "",
            "Usage:",
            "  logics-manager flow <command> [args...]",
            "",
            "Commands:",
            "  new <request|backlog|task>",
            "    Create a new doc from a template.",
            "    Common flags: --title, --slug, --from-version, --understanding, --confidence, --status, --complexity, --theme, --progress, --format {text,json}, --dry-run",
            "    Request-only flags: --fixture, --smoke-test",
            "    Backlog/task-only flags: --auto-create-product-brief, --auto-create-adr",
            "",
            "  list",
            "    List workflow docs that are still active.",
            "    Flags: --kind {all,request,backlog,task}, --format {text,json}",
            "",
            "  show <ref>",
            "    Show a bounded workflow document view.",
            "    Flags: --max-chars, --section, --format {text,json}",
            "",
            "  companion <product|architecture>",
            "    Create a companion doc from the integrated runtime.",
            "    Flags: --title, --source-ref, --request-ref, --backlog-ref, --task-ref, --format {text,json}, --dry-run",
            "",
            "  roadmap <propose|show|validate>",
            "    Create, inspect, or validate a versioned roadmap doc.",
            "    Flags: propose --title, --milestone, --product-ref, --request-ref, --backlog-ref, --task-ref, --format {text,json}, --dry-run",
            "",
            "  deliver --from-product <source>",
            "    Create a linked request, backlog item, and task from a product brief.",
            "    Flags: --title, --finish, --format {text,json}, --dry-run",
            "",
            "  scaffold request-chain --input <file>",
            "    Create a request, product brief, backlog slices, orchestration task, index, and optional context pack from structured JSON.",
            "    Flags: --context-pack <path>, --print-schema, --example, --format {text,json}, --dry-run",
            "    Recommended: create the full request chain and handoff pack in one pass with --context-pack.",
            "    Discover the input shape with --print-schema (or --example for a ready-to-edit skeleton) before authoring the JSON.",
            "",
            "  validate [refs...]",
            "    Combine lint and audit findings, classify fixable diagnostics, and optionally apply scoped deterministic fixes.",
            "    Flags: --fixable, --explain, --apply-fixes, --proof, --proof-source, --format {text,json}, --dry-run",
            "",
            "  validate-closeout <task>",
            "    Preflight whether a task can be safely closed.",
            "    Flags: --format {text,json}",
            "",
            "  start <ref>",
            "    Mark a workflow doc as In progress and record an owner.",
            "    Flags: --owner, --format {text,json}, --dry-run",
            "",
            "  progress task <source> --progress <n%>",
            "    Update task progress and recalculate linked backlog item progress.",
            "    Flags: --progress, --format {text,json}, --dry-run",
            "",
            "  repair <gates|ac-traceability|links|mermaid>",
            "    Apply deterministic closeout repairs.",
            "    Flags: --format {text,json}, --dry-run",
            "",
            "  closeout <task>",
            "    Append validation, repair deterministic gaps, finish, and optionally validate/index.",
            "    Flags: --validation, --index, --lint, --audit, --format {text,json}, --dry-run",
            "",
            "  promote request-to-backlog <source>",
            "    Create a backlog slice from a request.",
            "",
            "  promote backlog-to-task <source>",
            "    Create a task from a backlog item.",
            "",
            "  split request <source>",
            "    Split a request into multiple backlog items.",
            "    Flags: --title (repeatable) or --slice 'Title:AC1,AC2', --orchestration-task, plus the common backlog flags above.",
            "",
            "  split backlog <source>",
            "    Split a backlog item into multiple tasks.",
            "    Flags: --title (repeatable), plus the common task flags above.",
            "",
            "  close <request|backlog|task> <source>",
            "    Close a doc and propagate transitions.",
            "    Flags: --format {text,json}, --dry-run",
            "",
            "  withdraw <source> --superseded-by <ref>",
            "    Mark a doc Obsolete and record its replacement.",
            "    Flags: --format {text,json}, --dry-run",
            "",
            "  finish task <source>",
            "    Finish a task and verify the closure chain.",
            "    Flags: --format {text,json}, --dry-run",
            "",
            "Examples:",
            '  logics-manager flow new request --title "My request"',
            "  logics-manager flow scaffold request-chain --input logics/scaffold/request-chain.json --context-pack logics/context-pack.json",
            "  logics-manager sync context-pack req_001_my_request item_002_slice task_003_orchestrate --handoff --format json",
            "  logics-manager flow validate req_001_my_request --fixable --explain",
            "  logics-manager flow deliver --from-product prod_017_delivery_loop",
            '  logics-manager flow roadmap propose --title "New project" --milestone "0.1: MVP"',
            "  logics-manager flow show req_001_my_request",
            "  logics-manager flow validate-closeout task_003_fix_docs",
            "  logics-manager flow repair gates task_003_fix_docs",
            "  logics-manager flow closeout task_003_fix_docs --validation \"pytest passed\" --index --lint --audit",
            "  logics-manager flow promote request-to-backlog req_001_my_request",
            "  logics-manager flow close task task_003_fix_docs --dry-run",
        ]
    )


def _find_repo_root(start: Path) -> Path:
    """Delegate to the canonical resolver so `--repo-root` reaches flow too.

    This used to re-implement the walk, which meant the override set before
    dispatch was invisible here and `flow` alone still required the caller's
    working directory to be inside the target repository.
    """
    try:
        return find_repo_root(start)
    except ConfigError as exc:
        raise SystemExit(str(exc)) from exc


def _plan_doc(repo_root: Path, directory: str, prefix: str, title: str, dry_run: bool = False) -> PlannedDoc:
    target_dir = repo_root / directory
    if not dry_run:
        target_dir.mkdir(parents=True, exist_ok=True)
    slug = _slugify(title)
    highest = -1
    pattern = re.compile(rf"^{re.escape(prefix)}_(\d+)_.*\.md$")
    for path in target_dir.glob(f"{prefix}_*.md"):
        match = pattern.match(path.name)
        if match:
            highest = max(highest, int(match.group(1)))
    ref = f"{prefix}_{highest + 1:03d}_{slug}"
    path = target_dir / f"{ref}.md"
    return PlannedDoc(ref=ref, path=path)


def _read_json_object(path: Path, *, label: str) -> dict[str, object]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SystemExit(f"Missing {label}: {path.as_posix()}") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in {label}: {exc}") from exc
    if not isinstance(payload, dict):
        raise SystemExit(f"{label} must be a JSON object.")
    return payload


def _request_acceptance_map(lines: list[str]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for item in _bullet_values(_section_lines(lines, "Acceptance criteria")):
        match = re.match(r"AC(\d+)\s*:\s*(.+)", item.strip(), flags=re.IGNORECASE)
        if match:
            mapping[f"AC{match.group(1)}"] = f"AC{match.group(1)}: {match.group(2).strip()}"
    return mapping


def _parse_request_slice(raw: str, known_acs: dict[str, str]) -> dict[str, object]:
    if ":" not in raw:
        raise SystemExit("`--slice` must use `Title:AC1,AC2` syntax.")
    title, raw_acs = raw.split(":", 1)
    title = title.strip()
    if not title:
        raise SystemExit("`--slice` title is required.")
    ac_ids = [_normalize_ac_id(part) for part in re.split(r"[, ]+", raw_acs.strip()) if part.strip()]
    if not ac_ids:
        raise SystemExit("`--slice` requires at least one AC id.")
    unknown = [ac_id for ac_id in ac_ids if ac_id not in known_acs]
    if unknown:
        raise SystemExit(f"Unknown request AC id(s) for `--slice`: {', '.join(unknown)}")
    return {"title": title, "ac_ids": ac_ids}


def _strip_mermaid_blocks(text: str) -> str:
    return re.sub(r"```mermaid\s*\n.*?\n```", "", text, flags=re.DOTALL)


def _workflow_mermaid_block(kind: str, signature: str) -> list[str]:
    if kind == "request":
        body = [
            "flowchart TD",
            "    Need[Request need] --> Backlog[Backlog slice]",
            "    Backlog --> Task[Delivery task]",
        ]
    elif kind == "backlog":
        body = [
            "flowchart TD",
            "    Request[Request source] --> Scope[Backlog scope]",
            "    Scope --> Task[Delivery task]",
        ]
    else:
        body = [
            "flowchart TD",
            "    Backlog[Backlog item] --> Build[Implementation]",
            "    Build --> Validate[Validation]",
            "    Validate --> Close[Finish workflow]",
        ]
    return [
        "```mermaid",
        f"%% logics-kind: {kind}",
        f"%% logics-signature: {signature}",
        *body,
        "```",
    ]


def _with_workflow_mermaid_overview(kind: str, content: str) -> str:
    return content


_SHORT_REF_RE = re.compile(r"^([a-z]+)_(\d+)$")


def _short_ref_matches(repo_root: Path, kind: DocKind, ref: str) -> list[Path]:
    """req_286/item_524: full-slug docs a short ref (e.g. req_285) could mean.

    Matches by integer value so req_285 and req_5 / req_005 resolve regardless of
    zero-padding, like the rest of the CLI."""
    match = _SHORT_REF_RE.match(ref)
    if not match or match.group(1) != kind.prefix:
        return []
    want = int(match.group(2))
    directory = repo_root / kind.directory
    if not directory.is_dir():
        return []
    out = []
    for path in directory.glob(f"{kind.prefix}_*.md"):
        parts = path.stem.split("_", 2)
        if len(parts) >= 2 and parts[1].isdigit() and int(parts[1]) == want:
            out.append(path)
    return sorted(out)


def _resolve_doc_path(repo_root: Path, kind: DocKind, ref: str) -> Path | None:
    path = repo_root / kind.directory / f"{ref}.md"
    if path.is_file():
        return path
    # req_286/item_524: fall back to short-ref resolution (req_285 -> req_285_<slug>).
    matches = _short_ref_matches(repo_root, kind, ref)
    return matches[0] if len(matches) == 1 else None


ALL_DOC_DIRECTORIES = {
    "request": "logics/request",
    "backlog": "logics/backlog",
    "task": "logics/tasks",
    "product": "logics/product",
    "roadmap": "logics/roadmap",
    "architecture": "logics/architecture",
    "spec": "logics/specs",
}


def _locate_doc_anywhere(repo_root: Path, ref: str) -> tuple[Path, str] | None:
    """Find a document by bare ref across every kind, for honest error messages."""
    for kind_name, directory in ALL_DOC_DIRECTORIES.items():
        path = repo_root / directory / f"{ref}.md"
        if path.is_file():
            return path, kind_name
    return None


def _wrong_kind_error(repo_root: Path, source: str, kind: DocKind) -> str:
    """Say the document is of another kind rather than claiming it does not exist."""
    located = _locate_doc_anywhere(repo_root, source)
    if located is None:
        return f"Source not found: {source}"
    _path, actual_kind = located
    return (
        f"`{source}` is a {actual_kind} document; this command accepts a {kind.kind} "
        f"(a `{kind.prefix}_...` ref under `{kind.directory}`)."
    )


def _resolve_workflow_source(repo_root: Path, kind: DocKind, source: str) -> Path:
    raw = Path(source)
    if raw.is_absolute():
        candidate = raw.resolve()
        rel_path = ensure_relative_to(candidate, repo_root, label="source")
    elif any(part == ".." for part in raw.parts):
        raise SystemExit(f"Unsupported source `{source}`. Use a {kind.prefix}_... ref or repo-relative Logics path.")
    elif len(raw.parts) == 1 and raw.suffix != ".md":
        path = _resolve_doc_path(repo_root, kind, source)
        if path is None:
            raise SystemExit(_wrong_kind_error(repo_root, source, kind))
        return path
    else:
        candidate = (repo_root / raw).resolve()
        rel_path = ensure_relative_to(candidate, repo_root, label="source")
    expected_dir = Path(kind.directory)
    if candidate.parent != (repo_root / kind.directory).resolve():
        raise SystemExit(f"Expected source under `{kind.directory}`. Got: `{rel_path.as_posix()}`.")
    if not candidate.is_file():
        raise SystemExit(f"Source not found: {rel_path.as_posix()}")
    if not candidate.stem.startswith(f"{kind.prefix}_"):
        raise SystemExit(f"Expected a `{kind.prefix}_...` file for kind `{kind.kind}`. Got: {candidate.name}")
    if rel_path.parent != expected_dir:
        raise SystemExit(f"Expected source under `{kind.directory}`. Got: `{rel_path.as_posix()}`.")
    return candidate


def _resolve_product_source(repo_root: Path, source: str) -> Path:
    raw = Path(source)
    if raw.is_absolute():
        candidate = raw.resolve()
        rel_path = ensure_relative_to(candidate, repo_root, label="source")
    elif any(part == ".." for part in raw.parts):
        raise SystemExit("Unsupported product source. Use a prod_... ref or repo-relative product path.")
    elif len(raw.parts) == 1 and raw.suffix != ".md":
        candidate = repo_root / "logics" / "product" / f"{source}.md"
        rel_path = candidate.relative_to(repo_root)
    else:
        candidate = (repo_root / raw).resolve()
        rel_path = ensure_relative_to(candidate, repo_root, label="source")
    if candidate.parent != (repo_root / "logics" / "product").resolve():
        raise SystemExit(f"Expected product source under `logics/product`. Got: `{rel_path.as_posix()}`.")
    if not candidate.is_file():
        raise SystemExit(f"Product source not found: {rel_path.as_posix()}")
    if not candidate.stem.startswith("prod_"):
        raise SystemExit(f"Expected a `prod_...` product brief. Got: {candidate.name}")
    return candidate


def _append_section_bullets(path: Path, heading: str, bullets: list[str], dry_run: bool) -> None:
    if dry_run:
        return
    lines = path.read_text(encoding="utf-8").splitlines()
    start_idx = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == heading.strip().lower():
            start_idx = idx + 1
            break
    if start_idx is None:
        lines.extend(["", f"# {heading}", *[f"- {bullet}" for bullet in bullets]])
    else:
        insert_at = start_idx
        while insert_at < len(lines) and lines[insert_at].strip().startswith("- "):
            insert_at += 1
        existing = {line.strip() for line in lines[start_idx:insert_at] if line.strip().startswith("- ")}
        for bullet in bullets:
            rendered = f"- {bullet}"
            if rendered not in existing:
                lines.insert(insert_at, rendered)
                insert_at += 1
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _mark_section_checkboxes_done(path: Path, heading: str, dry_run: bool) -> None:
    if dry_run:
        return
    lines = path.read_text(encoding="utf-8").splitlines()
    start_idx = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == heading.strip().lower():
            start_idx = idx + 1
            break
    if start_idx is None:
        return
    changed = False
    for idx in range(start_idx, len(lines)):
        line = lines[idx]
        if line.startswith("# "):
            break
        if "- [ ]" in line:
            lines[idx] = line.replace("- [ ]", "- [x]", 1)
            changed = True
    if changed:
        path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _collect_docs_linking_ref(repo_root: Path, kind: DocKind, ref: str) -> list[Path]:
    directory = repo_root / kind.directory
    linked: list[Path] = []
    if not directory.is_dir():
        return linked
    for path in sorted(directory.glob("*.md")):
        if ref in path.read_text(encoding="utf-8"):
            linked.append(path)
    return linked


def _is_doc_done(path: Path, kind: DocKind) -> bool:
    lines = path.read_text(encoding="utf-8").splitlines()
    status_value = next((line.split(":", 1)[1].strip() for line in lines if line.startswith("> Status:")), None)
    if status_value is not None and " ".join(status_value.split()).lower() in {"done", "archived"}:
        return True
    if kind.include_progress:
        progress_value = next((line.split(":", 1)[1].strip() for line in lines if line.startswith("> Progress:")), None)
        if progress_value == "100%":
            return True
    return False


def _has_done_status(path: Path) -> bool:
    lines = path.read_text(encoding="utf-8").splitlines()
    return _normalize_status(_indicator_value_from_lines(lines, "Status")) in {"done", "archived"}


def _section_text(text: str, heading: str) -> str:
    return "\n".join(_section_lines(text.splitlines(), heading)).strip()


def _section_has_unchecked_checkbox(text: str, heading: str) -> bool:
    return any("- [ ]" in line for line in _section_lines(text.splitlines(), heading))


def _section_has_checked_checkbox(text: str, heading: str) -> bool:
    return any("- [x]" in line.lower() for line in _section_lines(text.splitlines(), heading))


def _request_ac_ids(text: str) -> list[str]:
    ids: list[str] = []
    for line in _section_lines(text.splitlines(), "Acceptance criteria"):
        match = re.search(r"\bAC(\d+)\s*:", line, flags=re.IGNORECASE)
        if match:
            ids.append(f"AC{int(match.group(1))}")
    return ids


def _first_product_path(repo_root: Path, product_ref: str) -> Path | None:
    path = repo_root / "logics" / "product" / f"{product_ref}.md"
    return path if path.is_file() else None


def _changed_rel(repo_root: Path, changed_paths: set[Path], path: Path, before: str | None) -> None:
    if before is not None and path.read_text(encoding="utf-8") != before:
        changed_paths.add(path.relative_to(repo_root))


def _request_ac_entries(request_path: Path) -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    for line in _section_lines(request_path.read_text(encoding="utf-8").splitlines(), "Acceptance criteria"):
        match = re.search(r"\bAC(\d+)\s*:\s*(.+)", line, flags=re.IGNORECASE)
        if match:
            entries.append((f"AC{int(match.group(1))}", match.group(2).strip()))
    return entries


def _ac_traceability_entry(ac_id: str, target: str, text: str, proof: str | None, proof_source: str | None) -> str:
    if proof and proof.strip():
        rendered = f"request-{ac_id} -> {target}. Proof: {proof.strip()}"
        if proof_source and proof_source.strip():
            rendered += f" Source: `{proof_source.strip()}`"
        return rendered
    return f"request-{ac_id} -> {target}. Evidence needed: {text}"


def _did_you_mean_hint(repo_root: Path, source: str) -> str:
    """req_286/item_524: candidate slugs for an ambiguous or missing short ref."""
    match = _SHORT_REF_RE.match(source)
    if not match:
        return ""
    prefix = match.group(1)
    kind = next((DOC_KINDS[k] for k in ("request", "backlog", "task") if DOC_KINDS[k].prefix == prefix), None)
    if kind is None:
        return ""
    matches = _short_ref_matches(repo_root, kind, source)
    if matches:  # ambiguous: more than one doc shares the number
        slugs = [path.stem for path in matches]
    else:  # missing: point at the refs that do exist for this kind
        directory = repo_root / kind.directory
        slugs = sorted(path.stem for path in directory.glob(f"{kind.prefix}_*.md")) if directory.is_dir() else []
    if not slugs:
        return ""
    shown = slugs[:5]
    suffix = "" if len(slugs) <= 5 else f", … (+{len(slugs) - 5} more)"
    return f" — did you mean: {', '.join(shown)}{suffix}"


def _resolve_any_workflow_source(repo_root: Path, source: str) -> tuple[Path, str]:
    for kind in ("request", "backlog", "task"):
        try:
            return _resolve_workflow_source(repo_root, DOC_KINDS[kind], source), kind
        except SystemExit:
            continue
    # A companion carries findings too, so resolving it here is what lets a repair
    # be addressed at the same granularity as the finding that named it.
    located = _locate_doc_anywhere(repo_root, Path(source).stem if source.endswith(".md") else source)
    if located is not None:
        return located
    raise SystemExit(f"Workflow source not found: {source}{_did_you_mean_hint(repo_root, source)}")


MERMAID_SIGNATURE_KINDS = ("request", "backlog", "task")


def _add_common_doc_args(parser: argparse.ArgumentParser, kind: str) -> None:
    parser.add_argument("--from-version")
    parser.add_argument("--understanding", default="90%")
    parser.add_argument("--confidence", default="85%")
    parser.add_argument("--status", default=STATUS_BY_KIND_DEFAULT[kind])
    parser.add_argument("--complexity", default="Medium")
    parser.add_argument("--theme", default="General")
    if DOC_KINDS[kind].include_progress:
        parser.add_argument("--progress", default="0%")
    else:
        parser.add_argument("--progress", default="")
    if kind in {"backlog", "task"}:
        parser.add_argument("--auto-create-product-brief", action="store_true")
        parser.add_argument("--auto-create-adr", action="store_true")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parser.add_argument("--dry-run", action="store_true")


def _build_native_request_doc(repo_root: Path, planned_ref: str, title: str, args: argparse.Namespace) -> str:
    from_version = _resolved_from_version(repo_root, getattr(args, "from_version", None))
    fixture_mode = bool(getattr(args, "fixture", False))
    context = [
        "Generated locally by logics-manager.",
        "No manual skills bootstrap or bridge editing is required.",
    ]
    if fixture_mode:
        context.append("Synthetic fixture for request generation smoke tests.")
    references = [
        "`logics_manager/flow.py`",
        "`logics_manager/assist.py`",
        "`tests/python/test_logics_manager_cli.py`",
    ]
    content = "\n".join(
        [
            f"## {planned_ref} - {title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            f"> Status: {getattr(args, 'status', 'Draft')}",
            f"> Understanding: {getattr(args, 'understanding', '90%')}",
            f"> Confidence: {getattr(args, 'confidence', '85%')}",
            f"> Complexity: {getattr(args, 'complexity', 'Medium')}",
            f"> Theme: {getattr(args, 'theme', 'General')}",
            "> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.",
            "",
            "# Needs",
            f"- Deliver a bounded request for {title.lower()}.",
            "",
            "# Context",
            *[f"- {item}" for item in context],
            "",
            "# Acceptance criteria",
            f"- AC1: The request states the bounded need for {title.lower()}.",
            "- AC2: Scope boundaries and operator impact are explicit.",
            "- AC3: The request is ready to be promoted into a backlog slice.",
            "",
            "# Definition of Ready (DoR)",
            "- [ ] Problem statement is explicit and user impact is clear.",
            "- [ ] Scope boundaries (in/out) are explicit.",
            "- [ ] Acceptance criteria are testable.",
            "- [ ] Dependencies and known risks are listed.",
            "",
            "# Companion docs",
            "- Product brief(s): (none yet)",
            "- Architecture decision(s): (none yet)",
            "",
            "# References",
            *[f"- {item}" for item in references],
            "",
            "# AI Context",
            f"- Summary: Draft a bounded request for {title.lower()}.",
            "- Keywords: request-draft, logics-manager, python runtime, bundled CLI",
            "- Use when: You need a new bounded request doc for the Logics workflow.",
            "- Skip when: The work already has an existing request or should go straight to a backlog slice.",
            "",
            "# Backlog",
            "- none",
            "",
        ]
    ).rstrip() + "\n"
    return _with_workflow_mermaid_overview("request", content)


def _build_native_backlog_doc(
    repo_root: Path,
    planned_ref: str,
    title: str,
    args: argparse.Namespace,
    *,
    request_ref: str | None = None,
    product_refs: list[str] | None = None,
    architecture_refs: list[str] | None = None,
) -> str:
    from_version = _resolved_from_version(repo_root, getattr(args, "from_version", None))
    product_refs = product_refs or []
    architecture_refs = architecture_refs or []
    product_line = ", ".join(f"`{ref}`" for ref in product_refs) if product_refs else "(none yet)"
    architecture_line = ", ".join(f"`{ref}`" for ref in architecture_refs) if architecture_refs else "(none yet)"
    request_line = f"`{request_ref}`" if request_ref else "(to be linked)"
    acceptance = [
        f"AC1: The backlog slice stays bounded for {title.lower()}.",
        "AC2: The backlog slice is reviewable and promotable into a task.",
    ]
    content = "\n".join(
        [
            f"## {planned_ref} - {title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            f"> Status: {getattr(args, 'status', 'Ready')}",
            f"> Understanding: {getattr(args, 'understanding', '90%')}",
            f"> Confidence: {getattr(args, 'confidence', '85%')}",
            f"> Progress: {getattr(args, 'progress', '0%')}",
            f"> Complexity: {getattr(args, 'complexity', 'Medium')}",
            f"> Theme: {getattr(args, 'theme', 'General')}",
            "> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.",
            "",
            "# Problem",
            f"- Deliver a bounded backlog slice for {title.lower()}.",
            "",
            "# Scope",
            "- In:",
            "  - one coherent delivery slice from the operator request.",
            "- Out:",
            "  - unrelated sibling slices.",
            "",
            "# Acceptance criteria",
            *[f"- {item}" for item in acceptance],
            "",
            "# AC Traceability",
            "- request-AC1 -> This backlog slice. Proof: bounded delivery slice.",
            "- request-AC2 -> This backlog slice. Proof: promotable backlog item.",
            "- request-AC3 -> This backlog slice. Proof: delivery chain includes a task-ready backlog item.",
            "",
            "# Decision framing",
            "- Product framing: Not needed",
            "- Architecture framing: Not needed",
            "",
            "# Links",
            f"- Product brief(s): {product_line}",
            f"- Architecture decision(s): {architecture_line}",
            f"- Request: {request_line}",
            "- Primary task(s): (none yet)",
            "",
            "# AI Context",
            f"- Summary: {title}",
            f"- Keywords: backlog, promote, slice, {title.lower()}",
            f"- Use when: You need a bounded backlog item for {title}.",
            "- Skip when: The change should go straight to implementation detail.",
            "",
            "# Priority",
            "- Priority: Medium",
            "- Rationale: Default until groomed.",
            "",
            "# Notes",
            "- Generated locally by logics-manager.",
            "",
        ]
    ).rstrip() + "\n"
    return _with_workflow_mermaid_overview("backlog", content)


def _build_native_task_doc(
    repo_root: Path,
    planned_ref: str,
    title: str,
    args: argparse.Namespace,
    *,
    backlog_ref: str | None = None,
    request_refs: list[str] | None = None,
    product_refs: list[str] | None = None,
    architecture_refs: list[str] | None = None,
) -> str:
    from_version = _resolved_from_version(repo_root, getattr(args, "from_version", None))
    request_refs = request_refs or []
    product_refs = product_refs or []
    architecture_refs = architecture_refs or []
    backlog_line = f"`{backlog_ref}`" if backlog_ref else "(to be linked)"
    request_line = ", ".join(f"`{ref}`" for ref in request_refs) if request_refs else "(none yet)"
    product_line = ", ".join(f"`{ref}`" for ref in product_refs) if product_refs else "(none yet)"
    architecture_line = ", ".join(f"`{ref}`" for ref in architecture_refs) if architecture_refs else "(none yet)"
    content = "\n".join(
        [
            f"## {planned_ref} - {title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            f"> Status: {getattr(args, 'status', 'Ready')}",
            f"> Understanding: {getattr(args, 'understanding', '90%')}",
            f"> Confidence: {getattr(args, 'confidence', '85%')}",
            f"> Progress: {getattr(args, 'progress', '0%')}",
            f"> Complexity: {getattr(args, 'complexity', 'Medium')}",
            f"> Theme: {getattr(args, 'theme', 'General')}",
            "> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.",
            "",
            "# Context",
            f"- Execute the bounded delivery slice for {title}.",
            "",
            "# Plan",
            "- [ ] 1. Confirm scope, dependencies, and linked acceptance criteria.",
            "- [ ] 2. Implement the next coherent delivery wave.",
            "- [ ] 3. Update affected Logics docs in the same wave and leave the repository commit-ready.",
            "- [ ] 4. Keep commit creation under operator control; do not force one commit per micro-step.",
            "- [ ] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.",
            "",
            "# Backlog",
            f"- {backlog_line}",
            "",
            "# Definition of Done (DoD)",
            "- [ ] Code is implemented and reviewed.",
            "- [ ] Validation passes.",
            "- [ ] Linked docs are synchronized.",
            "- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.",
            "",
            "# AC Traceability",
            "- request-AC1 -> This task. Proof: implementation delivers the bounded request need.",
            "- request-AC2 -> This task. Proof: implementation scope is limited to the linked delivery slice.",
            "- request-AC3 -> This task. Proof: implementation is executable from the promoted backlog item.",
            "- backlog-AC1 -> This task. Proof: task remains bounded to the linked backlog scope.",
            "- backlog-AC2 -> This task. Proof: task provides the executable implementation surface.",
            "",
            "# Validation",
            "- (no validation recorded yet)",
            "",
            "# Report",
            "- Not started.",
            "",
            "# AI Context",
            f"- Summary: Implement {title.lower()}.",
            "- Keywords: task, implementation, backlog, runtime, python",
            "- Use when: You need a bounded implementation task for a backlog item.",
            "- Skip when: The work is still at the request or backlog shaping stage.",
            "",
            "# Links",
            f"- Request: {request_line}",
            f"- Product brief(s): {product_line}",
            f"- Architecture decision(s): {architecture_line}",
            "",
        ]
    ).rstrip() + "\n"
    return content


def _extract_doc_title(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            payload = line.removeprefix("## ").strip()
            if " - " in payload:
                return payload.split(" - ", 1)[1].strip()
            return payload
    return path.stem


def _bullet_values(lines: list[str]) -> list[str]:
    values: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("- "):
            value = stripped[2:].strip()
            if value:
                values.append(value)
    return values


def _next_backlog_ref(repo_root: Path, title: str) -> str:
    directory = repo_root / "logics" / "backlog"
    highest = 0
    if directory.is_dir():
        for path in directory.glob("item_*.md"):
            stem = path.stem
            if stem.startswith("item_"):
                parts = stem.split("_", 2)
                if len(parts) >= 2 and parts[1].isdigit():
                    highest = max(highest, int(parts[1]))
    return f"item_{highest + 1:03d}_{_slugify(title)}"


def _next_task_ref(repo_root: Path, title: str) -> str:
    directory = repo_root / "logics" / "tasks"
    highest = 0
    if directory.is_dir():
        for path in directory.glob("task_*.md"):
            stem = path.stem
            if stem.startswith("task_"):
                parts = stem.split("_", 2)
                if len(parts) >= 2 and parts[1].isdigit():
                    highest = max(highest, int(parts[1]))
    return f"task_{highest + 1:03d}_{_slugify(title)}"


def _next_adr_ref(repo_root: Path, title: str) -> str:
    directory = repo_root / "logics" / "architecture"
    highest = 0
    if directory.is_dir():
        for path in directory.glob("adr_*.md"):
            stem = path.stem
            if stem.startswith("adr_"):
                parts = stem.split("_", 2)
                if len(parts) >= 2 and parts[1].isdigit():
                    highest = max(highest, int(parts[1]))
    return f"adr_{highest + 1:03d}_{_slugify(title)}"


def _append_doc_section_bullets(path: Path, heading: str, bullets: list[str], *, dry_run: bool) -> None:
    if dry_run:
        return
    lines = path.read_text(encoding="utf-8").splitlines()
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == heading.strip().lower():
            insert_at = idx + 1
            while insert_at < len(lines) and lines[insert_at].strip().startswith("- "):
                insert_at += 1
            existing = {line.strip() for line in lines[idx + 1 : insert_at] if line.strip().startswith("- ")}
            for bullet in bullets:
                rendered = f"- {bullet}"
                if rendered not in existing:
                    lines.insert(insert_at, rendered)
                    insert_at += 1
            path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
            return
    lines.extend(["", f"# {heading}", *[f"- {bullet}" for bullet in bullets]])
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _append_doc_section_bullets_changed(path: Path, heading: str, bullets: list[str], *, dry_run: bool) -> bool:
    if not bullets:
        return False
    before = path.read_text(encoding="utf-8") if path.is_file() else ""
    _append_doc_section_bullets(path, heading, bullets, dry_run=dry_run)
    if dry_run:
        return any(f"- {bullet}" not in before for bullet in bullets)
    return path.read_text(encoding="utf-8") != before


def _remove_section_placeholder_bullets(path: Path, heading: str, placeholders: set[str], *, dry_run: bool) -> bool:
    lines = path.read_text(encoding="utf-8").splitlines()
    target = heading.strip().lower()
    in_section = False
    changed = False
    output: list[str] = []
    for line in lines:
        if line.startswith("# "):
            in_section = line[2:].strip().lower() == target
            output.append(line)
            continue
        if in_section and line.strip().lower() in placeholders:
            changed = True
            continue
        output.append(line)
    if changed and not dry_run:
        path.write_text("\n".join(output).rstrip() + "\n", encoding="utf-8")
    return changed


def _replace_indicator_line(lines: list[str], label: str, value: str) -> list[str]:
    prefix = f"> {label}:"
    updated = False
    output: list[str] = []
    insert_at = 1
    for idx, line in enumerate(lines):
        if idx > 0 and line.startswith("> "):
            insert_at = idx + 1
        if line.startswith(prefix):
            output.append(f"{prefix} {value}")
            updated = True
        else:
            output.append(line)
    if not updated:
        output.insert(insert_at, f"{prefix} {value}")
    return output


def _replace_or_append_prefixed_section_bullet(
    lines: list[str],
    heading: str,
    bullet_prefix: str,
    rendered_value: str,
) -> list[str]:
    heading_idx = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == heading.strip().lower():
            heading_idx = idx
            break
    rendered = f"- {bullet_prefix}: {rendered_value}"
    if heading_idx is None:
        return [*lines, "", f"# {heading}", rendered]

    end_idx = heading_idx + 1
    while end_idx < len(lines) and not lines[end_idx].startswith("# "):
        end_idx += 1

    output = list(lines)
    for idx in range(heading_idx + 1, end_idx):
        if output[idx].strip().startswith(f"- {bullet_prefix}:"):
            output[idx] = rendered
            return output
    output.insert(end_idx, rendered)
    return output


def _update_request_product_link(request_path: Path, product_ref: str, *, dry_run: bool) -> None:
    if dry_run:
        return
    lines = request_path.read_text(encoding="utf-8").splitlines()
    lines = _replace_or_append_prefixed_section_bullet(lines, "Companion docs", "Product brief(s)", f"`{product_ref}`")
    request_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _build_native_product_brief(
    repo_root: Path,
    title: str,
    *,
    request_ref: str | None = None,
    backlog_ref: str | None = None,
    task_ref: str | None = None,
    architecture_refs: list[str] | None = None,
) -> tuple[str, str]:
    ref = _next_product_ref(repo_root, title)
    architecture_refs = architecture_refs or []
    related_request = f"`{request_ref}`" if request_ref else "(none yet)"
    related_backlog = f"`{backlog_ref}`" if backlog_ref else "(none yet)"
    related_task = f"`{task_ref}`" if task_ref else "(none yet)"
    related_architecture = ", ".join(f"`{item}`" for item in architecture_refs) if architecture_refs else "(none yet)"
    signature_slug = _slugify(title) or "product-brief"
    content = "\n".join(
        [
            f"## {ref} - {title}",
            f"> Date: {date.today().isoformat()}",
            "> Status: Proposed",
            f"> Related request: {related_request}",
            f"> Related backlog: {related_backlog}",
            f"> Related task: {related_task}",
            f"> Related architecture: {related_architecture}",
            "> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.",
            "",
            "# Overview",
            f"- (overview to write: what {title.lower()} is for, and for whom)",
            "",
            "```mermaid",
            "%% logics-kind: product",
            f"%% logics-signature: product|{signature_slug}|generated",
            "flowchart TD",
            "    Need[Product need] --> Scope[Scope and guardrails]",
            "    Scope --> Decisions[Key decisions]",
            "    Decisions --> Signals[Success signals]",
            "```",
            "",
            "# Goals",
            "- (goal to document)",
            "",
            "# Non-goals",
            "- (non-goal to document)",
            "",
            "# Scope and guardrails",
            "- In: (to document)",
            "- Out: (to document)",
            "",
            "# Key product decisions",
            "- (decision to document)",
            "",
            "# Success signals",
            "- (success signal to document)",
            "",
            "# References",
            f"- Product back-reference: {related_backlog}",
            f"- Task back-reference: {related_task}",
            "",
        ]
    ).rstrip() + "\n"
    return ref, content


def _build_native_adr(
    repo_root: Path,
    title: str,
    *,
    request_ref: str | None = None,
    backlog_ref: str | None = None,
    task_ref: str | None = None,
) -> tuple[str, str]:
    ref = _next_adr_ref(repo_root, title)
    related_request = f"`{request_ref}`" if request_ref else "(none yet)"
    related_backlog = f"`{backlog_ref}`" if backlog_ref else "(none yet)"
    related_task = f"`{task_ref}`" if task_ref else "(none yet)"
    content = "\n".join(
        [
            f"## {ref} - {title}",
            f"> Date: {date.today().isoformat()}",
            "> Status: Proposed",
            f"> Related request: {related_request}",
            f"> Related backlog: {related_backlog}",
            f"> Related task: {related_task}",
            "> Drivers: (drivers to document)",
            "> Reminder: Update status, linked refs, decision rationale, consequences, and follow-up work when you edit this doc.",
            "",
            "# Overview",
            f"- (overview to write: the decision {title.lower()} records, in one line)",
            "",
            "# Context",
            "- (context to document)",
            "",
            "# Decision",
            "- (decision to document)",
            "",
            "# Consequences",
            "- (consequence to document)",
            "",
            "# References",
            f"- Related request: {related_request}",
            f"- Related backlog: {related_backlog}",
            f"- Related task: {related_task}",
            "",
        ]
    ).rstrip() + "\n"
    return ref, content


def _build_native_backlog_from_request(
    repo_root: Path,
    request_path: Path,
    title: str | None = None,
    *,
    product_refs: list[str] | None = None,
    architecture_refs: list[str] | None = None,
) -> tuple[str, str]:
    request_lines = request_path.read_text(encoding="utf-8").splitlines()
    request_title = title or _extract_doc_title(request_path)
    ref = _next_backlog_ref(repo_root, request_title)
    from_version = next((line.split(":", 1)[1].strip() for line in request_lines if line.strip().startswith("> From version:")), _resolved_from_version(repo_root, None))
    product_refs = product_refs or []
    architecture_refs = architecture_refs or []
    product_line = ", ".join(f"`{item}`" for item in product_refs) if product_refs else "(none yet)"
    architecture_line = ", ".join(f"`{item}`" for item in architecture_refs) if architecture_refs else "(none yet)"
    needs = _bullet_values(_section_lines(request_lines, "Needs"))
    acceptance = _bullet_values(_section_lines(request_lines, "Acceptance criteria"))
    if not needs:
        needs = [f"Deliver a bounded slice for {request_title.lower()}."]
    if not acceptance:
        acceptance = [
            "AC1: The backlog slice stays bounded and reviewable.",
            "AC2: The backlog slice preserves the request's core acceptance criteria.",
        ]
    content = "\n".join(
        [
            f"## {ref} - {request_title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            "> Status: Ready",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Progress: 0%",
            "> Complexity: High",
            "> Theme: Operator workflow and runtime integration",
            "> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.",
            "",
            "# Problem",
            *needs,
            "",
            "# Scope",
            "- In:",
            "  - one coherent delivery slice from the source request",
            "- Out:",
            "  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc",
            "",
            "# Acceptance criteria",
            *[f"- {item}" for item in acceptance],
            "",
            "# AC Traceability",
            *[f"- request-AC{idx + 1} -> This backlog slice. Proof: {item}" for idx, item in enumerate(acceptance)],
            "",
            "# Decision framing",
            "- Product framing: Not needed",
            "- Product signals: (none detected)",
            "- Product follow-up: No product brief follow-up is expected based on current signals.",
            "- Architecture framing: Not needed",
            "- Architecture signals: (none detected)",
            "- Architecture follow-up: No architecture decision follow-up is expected based on current signals.",
            "",
            "# Links",
            f"- Product brief(s): {product_line}",
            f"- Architecture decision(s): {architecture_line}",
            f"- Request: `{request_path.relative_to(repo_root).as_posix()}`",
            "- Primary task(s): (none yet)",
            "",
            "# AI Context",
            f"- Summary: {request_title}",
            f"- Keywords: backlog-groom, request, {request_title.lower()}, bounded slice",
            f"- Use when: Use when implementing or reviewing the delivery slice for {request_title}.",
            "- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.",
            "",
            "# Priority",
            "- Priority: Medium",
            "- Rationale: Default until groomed.",
            "",
            "# Notes",
            f"- Hybrid rationale: Derived from request `{request_path.stem}` and kept bounded to one coherent delivery slice.",
            f"- Source file: `{request_path.relative_to(repo_root).as_posix()}`.",
            "- Generated locally by logics-manager.",
            "",
        ]
    ).rstrip() + "\n"
    return ref, _with_workflow_mermaid_overview("backlog", content)


def _build_native_task_from_backlog(
    repo_root: Path,
    backlog_path: Path,
    title: str | None = None,
    *,
    request_refs: list[str] | None = None,
    product_refs: list[str] | None = None,
    architecture_refs: list[str] | None = None,
) -> tuple[str, str]:
    backlog_lines = backlog_path.read_text(encoding="utf-8").splitlines()
    backlog_title = title or _extract_doc_title(backlog_path)
    ref = _next_task_ref(repo_root, backlog_title)
    from_version = next((line.split(":", 1)[1].strip() for line in backlog_lines if line.strip().startswith("> From version:")), _resolved_from_version(repo_root, None))
    backlog_ref = backlog_path.stem
    request_refs = request_refs or []
    product_refs = product_refs or []
    architecture_refs = architecture_refs or []
    request_line = ", ".join(f"`{item}`" for item in request_refs) if request_refs else "(none yet)"
    product_line = ", ".join(f"`{item}`" for item in product_refs) if product_refs else "(none yet)"
    architecture_line = ", ".join(f"`{item}`" for item in architecture_refs) if architecture_refs else "(none yet)"
    acceptance = _bullet_values(_section_lines(backlog_lines, "Acceptance criteria"))
    if not acceptance:
        acceptance = [
            "AC1: The task remains bounded and executable.",
            "AC2: The task preserves the backlog item's delivery intent.",
        ]
    content = "\n".join(
        [
            f"## {ref} - {backlog_title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            "> Status: Ready",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Progress: 0%",
            "> Complexity: Medium",
            "> Theme: Implementation delivery",
            "> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.",
            "",
            "# Definition of Done (DoD)",
            "- [ ] The backlog scope is implemented.",
            "- [ ] Acceptance criteria are covered.",
            "- [ ] Validation passes.",
            "- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.",
            "",
            "# Backlog",
            f"- `{backlog_ref}`",
            "",
            "# Acceptance criteria",
            *[f"- {item}" for item in acceptance],
            "",
            "# Plan",
            f"- [ ] Use `python3 -m logics_manager flow progress task {ref}.md --progress <n>%` during multi-wave work.",
            f"- [ ] Run `python3 -m logics_manager flow finish task {ref}.md` after implementation.",
            "",
            "# Validation",
            "- (no validation recorded yet)",
            "",
            "# Report",
            "- Not started.",
            "",
            "# AI Context",
            f"- Summary: Implement {backlog_title.lower()}.",
            "- Keywords: task, implementation, backlog, runtime, python",
            "- Use when: You need a bounded implementation task for a backlog item.",
            "- Skip when: The work is still at the request or backlog shaping stage.",
            "",
            "# Links",
            f"- Request: {request_line}",
            f"- Product brief(s): {product_line}",
            f"- Architecture decision(s): {architecture_line}",
            "",
        ]
    ).rstrip() + "\n"
    return ref, content


def _scoped_findings(findings: list[dict[str, object]], scoped_paths: set[str]) -> list[dict[str, object]]:
    if not scoped_paths:
        return list(findings)
    return [finding for finding in findings if str(finding.get("path") or "") in scoped_paths]


def _snapshot_existing_files(repo_root: Path, rel_paths: list[str]) -> dict[str, str]:
    snapshot: dict[str, str] = {}
    for rel_path in rel_paths:
        path = repo_root / rel_path
        if path.is_file():
            snapshot[rel_path] = path.read_text(encoding="utf-8")
    return snapshot


def _restore_file_snapshot(repo_root: Path, snapshot: dict[str, str]) -> None:
    for rel_path, content in snapshot.items():
        path = repo_root / rel_path
        path.write_text(content, encoding="utf-8")


def _indicator_value_from_lines(lines: list[str], key: str) -> str | None:
    prefix = f"> {key}:"
    for line in lines:
        if line.startswith(prefix):
            return line.split(":", 1)[1].strip()
    return None


def _upsert_workflow_indicator(lines: list[str], key: str, value: str) -> list[str]:
    prefix = f"> {key}:"
    updated: list[str] = []
    replaced = False
    last_indicator_index = -1
    for line in lines:
        if line.startswith("> "):
            last_indicator_index = len(updated)
        if line.startswith(prefix):
            updated.append(f"> {key}: {value}")
            replaced = True
        else:
            updated.append(line)
    if not replaced:
        insert_at = last_indicator_index + 1 if last_indicator_index >= 0 else 1
        updated.insert(insert_at, f"> {key}: {value}")
    return updated


BACKLOG_ACTIVE_PROGRESS_FLOOR = 10


PROGRESS_CLOSED_STATUSES = {"done", "blocked", "obsolete", "archived"}


def _write_workflow_indicators(path: Path, updates: dict[str, str], *, dry_run: bool) -> bool:
    lines = path.read_text(encoding="utf-8").splitlines()
    updated = lines
    for key, value in updates.items():
        updated = _upsert_workflow_indicator(updated, key, value)
    changed = updated != lines
    if changed and not dry_run:
        path.write_text("\n".join(updated) + "\n", encoding="utf-8")
    return changed
