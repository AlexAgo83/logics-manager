from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path


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


def _split_titles(raw_titles: list[str]) -> list[str]:
    titles = [title.strip() for title in raw_titles if title and title.strip()]
    if not titles:
        raise SystemExit("Provide at least one non-empty --title value.")
    return titles


def _slugify(text: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "_" for ch in text)
    cleaned = "_".join(part for part in cleaned.split("_") if part)
    return cleaned or "request"


def _resolved_from_version(repo_root: Path, from_version: str | None) -> str:
    if from_version:
        return from_version
    package_json = repo_root / "package.json"
    if not package_json.is_file():
        return "1.0.0"
    try:
        payload = json.loads(package_json.read_text(encoding="utf-8"))
    except Exception:
        return "1.0.0"
    version = payload.get("version") if isinstance(payload, dict) else None
    return str(version).strip() if version else "1.0.0"


def _find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "logics").is_dir():
            return candidate
    raise SystemExit("Could not locate repo root (missing 'logics/' directory). Run from inside the repo.")


def _plan_doc(repo_root: Path, directory: str, prefix: str, title: str, dry_run: bool = False) -> PlannedDoc:
    target_dir = repo_root / directory
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


def _extract_refs(text: str, prefix: str) -> list[str]:
    pattern = re.compile(rf"\b{re.escape(prefix)}_\d{{3}}_[a-z0-9_]+\b")
    return sorted({match.group(0) for match in pattern.finditer(text)})


def _strip_mermaid_blocks(text: str) -> str:
    return re.sub(r"```mermaid\s*\n.*?\n```", "", text, flags=re.DOTALL)


def _resolve_doc_path(repo_root: Path, kind: DocKind, ref: str) -> Path | None:
    path = repo_root / kind.directory / f"{ref}.md"
    return path if path.is_file() else None


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


def _close_doc(path: Path, kind: DocKind, dry_run: bool) -> None:
    if dry_run:
        return
    lines = path.read_text(encoding="utf-8").splitlines()
    updated: list[str] = []
    saw_status = False
    saw_progress = False
    for line in lines:
        if line.startswith("> Status:"):
            updated.append("> Status: Done")
            saw_status = True
        elif kind.include_progress and line.startswith("> Progress:"):
            updated.append("> Progress: 100%")
            saw_progress = True
        else:
            updated.append(line)
    if not saw_status:
        updated.insert(1, "> Status: Done")
    if kind.include_progress and not saw_progress:
        insert_at = 2 if saw_status else 3
        updated.insert(insert_at, "> Progress: 100%")
    path.write_text("\n".join(updated).rstrip() + "\n", encoding="utf-8")


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
        "`python_tests/test_logics_manager_cli.py`",
    ]
    return "\n".join(
        [
            f"## {planned_ref} - {title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            "> Status: Draft",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Complexity: Medium",
            "> Theme: Operator workflow",
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
    return "\n".join(
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
            "- Impact:",
            "- Urgency:",
            "",
            "# Notes",
            "- Generated locally by logics-manager.",
            "",
        ]
    ).rstrip() + "\n"


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
    return "\n".join(
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
            "- [ ] 3. Checkpoint the wave in a commit-ready state, validate it, and update the linked Logics docs.",
            "- [ ] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.",
            "",
            "# Backlog",
            f"- {backlog_line}",
            "",
            "# Definition of Done (DoD)",
            "- [ ] Code is implemented and reviewed.",
            "- [ ] Validation passes.",
            "- [ ] Linked docs are synchronized.",
            "",
            "# Validation",
            "- Run `python3 -m logics_manager lint --require-status`.",
            "- Run the task-specific automated tests.",
            "",
            "# Report",
            "- Implementation complete.",
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


def _extract_doc_title(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            payload = line.removeprefix("## ").strip()
            if " - " in payload:
                return payload.split(" - ", 1)[1].strip()
            return payload
    return path.stem


def _section_lines(lines: list[str], heading: str) -> list[str]:
    target = heading.strip().lower()
    start_idx = None
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


def _next_product_ref(repo_root: Path, title: str) -> str:
    directory = repo_root / "logics" / "product"
    highest = 0
    if directory.is_dir():
        for path in directory.glob("prod_*.md"):
            stem = path.stem
            if stem.startswith("prod_"):
                parts = stem.split("_", 2)
                if len(parts) >= 2 and parts[1].isdigit():
                    highest = max(highest, int(parts[1]))
    return f"prod_{highest + 1:03d}_{_slugify(title)}"


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
            f"Logics should keep a single, predictable product surface for {title.lower()}.",
            "",
            "# Goals",
            "- Keep the operator experience bounded and easy to reason about.",
            "- Preserve the CLI as the canonical workflow entrypoint.",
            "",
            "# Non-goals",
            "- Rebuilding the VS Code plugin UI in this document.",
            "- Adding a remote runtime boundary.",
            "",
            "# Scope and guardrails",
            "- In: user-facing workflow shape, CLI contract, and migration boundaries.",
            "- Out: unrelated UI redesign or cloud-hosted orchestration.",
            "",
            "# Key product decisions",
            "- Keep the runtime integrated and local.",
            "- Keep assistant-facing instructions derived from the runtime.",
            "",
            "# Success signals",
            "- The change can be used without extra manual setup.",
            "- The product can be explained from a single reference surface.",
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
            "> Reminder: Update status, linked refs, decision rationale, consequences, and follow-up work when you edit this doc.",
            "",
            "# Overview",
            f"This ADR captures the native direction for {title.lower()}.",
            "",
            "# Context",
            "- The runtime is being consolidated into the main repo.",
            "- Legacy skill/bootstrap boundaries are being retired.",
            "",
            "# Decision",
            "- Prefer a native Python runtime with a minimal plugin shell.",
            "",
            "# Consequences",
            "- The CLI becomes the primary operational surface.",
            "- Companion docs can be generated from the same runtime contract.",
            "",
            "# References",
            f"- Related request: {related_request}",
            f"- Related backlog: {related_backlog}",
            f"- Related task: {related_task}",
            "",
        ]
    ).rstrip() + "\n"
    return ref, content


def _create_native_companion_docs(
    repo_root: Path,
    title: str,
    *,
    request_ref: str | None = None,
    backlog_ref: str | None = None,
    task_ref: str | None = None,
    args: argparse.Namespace,
) -> tuple[list[str], list[str]]:
    created_product_refs: list[str] = []
    created_architecture_refs: list[str] = []

    if getattr(args, "auto_create_adr", False):
        adr_ref, adr_content = _build_native_adr(
            repo_root,
            title,
            request_ref=request_ref,
            backlog_ref=backlog_ref,
            task_ref=task_ref,
        )
        adr_path = repo_root / "logics" / "architecture" / f"{adr_ref}.md"
        if not args.dry_run:
            adr_path.parent.mkdir(parents=True, exist_ok=True)
            adr_path.write_text(adr_content, encoding="utf-8")
        created_architecture_refs.append(adr_ref)

    if getattr(args, "auto_create_product_brief", False):
        product_ref, product_content = _build_native_product_brief(
            repo_root,
            title,
            request_ref=request_ref,
            backlog_ref=backlog_ref,
            task_ref=task_ref,
            architecture_refs=created_architecture_refs,
        )
        product_path = repo_root / "logics" / "product" / f"{product_ref}.md"
        if not args.dry_run:
            product_path.parent.mkdir(parents=True, exist_ok=True)
            product_path.write_text(product_content, encoding="utf-8")
        created_product_refs.append(product_ref)

    return created_product_refs, created_architecture_refs


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
            "- Impact:",
            "- Urgency:",
            "",
            "# Notes",
            f"- Hybrid rationale: Derived from request `{request_path.stem}` and kept bounded to one coherent delivery slice.",
            f"- Source file: `{request_path.relative_to(repo_root).as_posix()}`.",
            "- Generated locally by logics-manager.",
            "",
        ]
    ).rstrip() + "\n"
    return ref, content


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
            "",
            "# Backlog",
            f"- `{backlog_ref}`",
            "",
            "# Acceptance criteria",
            *[f"- {item}" for item in acceptance],
            "",
            "# Validation",
            "- Run `python3 -m logics_manager lint --require-status`.",
            f"- Run `python3 -m logics_manager flow finish task {ref}.md` after implementation.",
            "",
            "# Report",
            "- Implementation complete.",
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


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="logics-manager flow",
        description="Create Logics docs with consistent IDs, templates, and workflow transitions.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    new_parser = sub.add_parser("new", help="Create a new Logics doc from a template.")
    new_sub = new_parser.add_subparsers(dest="kind", required=True)
    for kind in DOC_KINDS:
        kind_parser = new_sub.add_parser(kind, help=f"Create a new {kind} doc.")
        kind_parser.add_argument("--title", required=True)
        kind_parser.add_argument("--slug", help="Override slug derived from the title.")
        if kind == "request":
            kind_parser.add_argument("--fixture", action="store_true", help="Generate a compact fixture-friendly request.")
            kind_parser.add_argument("--smoke-test", action="store_true", dest="fixture", help="Alias for --fixture.")
        _add_common_doc_args(kind_parser, kind)
        kind_parser.set_defaults(func=cmd_new)

    promote_parser = sub.add_parser("promote", help="Promote between Logics stages.")
    promote_sub = promote_parser.add_subparsers(dest="promotion", required=True)

    r2b = promote_sub.add_parser("request-to-backlog", help="Create a backlog slice from a request.")
    r2b.add_argument("source")
    _add_common_doc_args(r2b, "backlog")
    r2b.set_defaults(func=cmd_promote_request_to_backlog)

    b2t = promote_sub.add_parser("backlog-to-task", help="Create a task from a backlog item.")
    b2t.add_argument("source")
    _add_common_doc_args(b2t, "task")
    b2t.set_defaults(func=cmd_promote_backlog_to_task)

    split_parser = sub.add_parser("split", help="Split a request or backlog into bounded children.")
    split_sub = split_parser.add_subparsers(dest="split_kind", required=True)

    split_request = split_sub.add_parser("request", help="Split a request into multiple backlog items.")
    split_request.add_argument("source")
    split_request.add_argument("--title", action="append", nargs="+", required=True)
    _add_common_doc_args(split_request, "backlog")
    split_request.set_defaults(func=cmd_split_request)

    split_backlog = split_sub.add_parser("backlog", help="Split a backlog item into multiple tasks.")
    split_backlog.add_argument("source")
    split_backlog.add_argument("--title", action="append", nargs="+", required=True)
    _add_common_doc_args(split_backlog, "task")
    split_backlog.set_defaults(func=cmd_split_backlog)

    close_parser = sub.add_parser("close", help="Close a request, backlog item, or task and propagate transitions.")
    close_sub = close_parser.add_subparsers(dest="kind", required=True)
    for kind in ("request", "backlog", "task"):
        kind_parser = close_sub.add_parser(kind, help=f"Close a {kind} doc.")
        kind_parser.add_argument("source")
        kind_parser.add_argument("--format", choices=("text", "json"), default="text")
        kind_parser.add_argument("--dry-run", action="store_true")
        kind_parser.set_defaults(func=cmd_close)

    finish_parser = sub.add_parser("finish", help="Finish a task and verify the closure chain.")
    finish_sub = finish_parser.add_subparsers(dest="kind", required=True)
    finish_task = finish_sub.add_parser("task", help="Finish a task.")
    finish_task.add_argument("source")
    finish_task.add_argument("--format", choices=("text", "json"), default="text")
    finish_task.add_argument("--dry-run", action="store_true")
    finish_task.set_defaults(func=cmd_finish_task)

    return parser


def cmd_new(args: argparse.Namespace) -> dict[str, object]:
    doc_kind = DOC_KINDS[args.kind]
    repo_root = _find_repo_root(Path.cwd())
    planned = _plan_doc(repo_root, doc_kind.directory, doc_kind.prefix, args.slug or args.title, dry_run=args.dry_run)
    payload: dict[str, object] = {
        "command": "new",
        "kind": doc_kind.kind,
        "ref": planned.ref,
        "path": planned.path.relative_to(repo_root).as_posix(),
        "dry_run": args.dry_run,
    }
    if doc_kind.kind == "request":
        content = _build_native_request_doc(repo_root, planned.ref, args.title, args)
        if not args.dry_run:
            planned.path.parent.mkdir(parents=True, exist_ok=True)
            planned.path.write_text(content, encoding="utf-8")
            print(f"Wrote {planned.path}")
        else:
            preview = content if len(content) <= 2000 else content[:2000] + "\n...\n"
            print(f"[dry-run] would write: {planned.path}")
            print(preview)
        print(f"Created {doc_kind.kind}: {payload['path']}")
        return payload
    if doc_kind.kind == "backlog":
        product_refs, architecture_refs = _create_native_companion_docs(
            repo_root,
            args.title,
            request_ref=None,
            backlog_ref=planned.ref,
            task_ref=None,
            args=args,
        )
        content = _build_native_backlog_doc(
            repo_root,
            planned.ref,
            args.title,
            args,
            request_ref=None,
            product_refs=product_refs,
            architecture_refs=architecture_refs,
        )
    elif doc_kind.kind == "task":
        product_refs, architecture_refs = _create_native_companion_docs(
            repo_root,
            args.title,
            request_ref=None,
            backlog_ref=None,
            task_ref=planned.ref,
            args=args,
        )
        content = _build_native_task_doc(
            repo_root,
            planned.ref,
            args.title,
            args,
            backlog_ref=None,
            request_refs=[],
            product_refs=product_refs,
            architecture_refs=architecture_refs,
        )
    else:
        raise SystemExit(f"Unsupported doc kind `{doc_kind.kind}` for native creation.")

    if not args.dry_run:
        planned.path.parent.mkdir(parents=True, exist_ok=True)
        planned.path.write_text(content, encoding="utf-8")
        print(f"Wrote {planned.path}")
    else:
        preview = content if len(content) <= 2000 else content[:2000] + "\n...\n"
        print(f"[dry-run] would write: {planned.path}")
        print(preview)

    print(f"Created {doc_kind.kind}: {payload['path']}")
    return payload


def cmd_promote_request_to_backlog(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = Path(args.source).resolve()
    if not source_path.is_file():
        raise SystemExit(f"Source not found: {source_path}")
    title = _extract_doc_title(source_path)
    ref, _ = _build_native_backlog_from_request(repo_root, source_path, title)
    product_refs, architecture_refs = _create_native_companion_docs(
        repo_root,
        title,
        request_ref=source_path.stem,
        backlog_ref=ref,
        task_ref=None,
        args=args,
    )
    _, content = _build_native_backlog_from_request(
        repo_root,
        source_path,
        title,
        product_refs=product_refs,
        architecture_refs=architecture_refs,
    )
    planned_path = repo_root / "logics" / "backlog" / f"{ref}.md"
    if not args.dry_run:
        planned_path.parent.mkdir(parents=True, exist_ok=True)
        planned_path.write_text(content, encoding="utf-8")
        _append_doc_section_bullets(source_path, "Backlog", [f"`{ref}`"], dry_run=False)
    payload = {
        "command": "promote",
        "promotion": "request-to-backlog",
        "source": source_path.relative_to(repo_root).as_posix(),
        "created_ref": ref,
        "created_path": planned_path.relative_to(repo_root).as_posix(),
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Created backlog slice from request: {payload['created_path']}")
    return payload


def cmd_promote_backlog_to_task(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = Path(args.source).resolve()
    if not source_path.is_file():
        raise SystemExit(f"Source not found: {source_path}")
    title = _extract_doc_title(source_path)
    source_text = source_path.read_text(encoding="utf-8")
    request_refs = sorted(_extract_refs(_strip_mermaid_blocks(source_text), DOC_KINDS["request"].prefix))
    ref, _ = _build_native_task_from_backlog(repo_root, source_path, title)
    product_refs, architecture_refs = _create_native_companion_docs(
        repo_root,
        title,
        request_ref=request_refs[0] if request_refs else None,
        backlog_ref=source_path.stem,
        task_ref=ref,
        args=args,
    )
    _, content = _build_native_task_from_backlog(
        repo_root,
        source_path,
        title,
        request_refs=request_refs,
        product_refs=product_refs,
        architecture_refs=architecture_refs,
    )
    planned_path = repo_root / "logics" / "tasks" / f"{ref}.md"
    if not args.dry_run:
        planned_path.parent.mkdir(parents=True, exist_ok=True)
        planned_path.write_text(content, encoding="utf-8")
        _append_doc_section_bullets(source_path, "Tasks", [f"`{ref}`"], dry_run=False)
    payload = {
        "command": "promote",
        "promotion": "backlog-to-task",
        "source": source_path.relative_to(repo_root).as_posix(),
        "created_ref": ref,
        "created_path": planned_path.relative_to(repo_root).as_posix(),
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Created task from backlog: {payload['created_path']}")
    return payload


def cmd_split_request(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = Path(args.source).resolve()
    if not source_path.is_file():
        raise SystemExit(f"Source not found: {source_path}")
    titles = _split_titles([title for group in args.title for title in group])
    created_refs: list[str] = []
    for title in titles:
        ref, _ = _build_native_backlog_from_request(
            repo_root,
            source_path,
            title,
        )
        product_refs, architecture_refs = _create_native_companion_docs(
            repo_root,
            title,
            request_ref=source_path.stem,
            backlog_ref=ref,
            task_ref=None,
            args=args,
        )
        _, content = _build_native_backlog_from_request(
            repo_root,
            source_path,
            title,
            product_refs=product_refs,
            architecture_refs=architecture_refs,
        )
        planned_path = repo_root / "logics" / "backlog" / f"{ref}.md"
        if not args.dry_run:
            planned_path.parent.mkdir(parents=True, exist_ok=True)
            planned_path.write_text(content, encoding="utf-8")
            _append_doc_section_bullets(source_path, "Backlog", [f"`{ref}`"], dry_run=False)
        created_refs.append(ref)
    payload = {
        "command": "split",
        "kind": "request",
        "source": source_path.relative_to(repo_root).as_posix(),
        "created_refs": created_refs,
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Split request into {len(created_refs)} backlog item(s): {', '.join(created_refs)}")
    return payload


def cmd_split_backlog(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = Path(args.source).resolve()
    if not source_path.is_file():
        raise SystemExit(f"Source not found: {source_path}")
    source_text = source_path.read_text(encoding="utf-8")
    request_refs = sorted(_extract_refs(_strip_mermaid_blocks(source_text), DOC_KINDS["request"].prefix))
    titles = _split_titles([title for group in args.title for title in group])
    created_refs: list[str] = []
    for title in titles:
        ref, _ = _build_native_task_from_backlog(repo_root, source_path, title)
        product_refs, architecture_refs = _create_native_companion_docs(
            repo_root,
            title,
            request_ref=request_refs[0] if request_refs else None,
            backlog_ref=source_path.stem,
            task_ref=ref,
            args=args,
        )
        _, content = _build_native_task_from_backlog(
            repo_root,
            source_path,
            title,
            request_refs=request_refs,
            product_refs=product_refs,
            architecture_refs=architecture_refs,
        )
        planned_path = repo_root / "logics" / "tasks" / f"{ref}.md"
        if not args.dry_run:
            planned_path.parent.mkdir(parents=True, exist_ok=True)
            planned_path.write_text(content, encoding="utf-8")
            _append_doc_section_bullets(source_path, "Tasks", [f"`{ref}`"], dry_run=False)
        created_refs.append(ref)
    payload = {
        "command": "split",
        "kind": "backlog",
        "source": source_path.relative_to(repo_root).as_posix(),
        "created_refs": created_refs,
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Split backlog item into {len(created_refs)} task(s): {', '.join(created_refs)}")
    return payload


def cmd_close(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    kind = DOC_KINDS[args.kind]
    source_path = Path(args.source).resolve()
    if not source_path.is_file():
        raise SystemExit(f"Source not found: {source_path}")
    if not source_path.stem.startswith(f"{kind.prefix}_"):
        raise SystemExit(f"Expected a `{kind.prefix}_...` file for kind `{kind.kind}`. Got: {source_path.name}")

    _close_chain_for_kind(repo_root, source_path, kind, dry_run=args.dry_run)
    print(f"Closed {kind.kind}: {source_path.relative_to(repo_root)}")

    payload = {
        "command": "close",
        "kind": kind.kind,
        "source": source_path.relative_to(repo_root).as_posix(),
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    return payload


def _verify_finished_task_chain(repo_root: Path, task_path: Path) -> list[str]:
    issues: list[str] = []
    task_ref = task_path.stem
    task_text = _strip_mermaid_blocks(task_path.read_text(encoding="utf-8"))
    item_refs = sorted(_extract_refs(task_text, "item"))

    if not item_refs:
        return [f"task `{task_ref}` has no linked backlog item reference"]

    processed_request_refs: set[str] = set()
    for item_ref in item_refs:
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is None:
            issues.append(f"task `{task_ref}` references missing backlog item `{item_ref}`")
            continue
        if not _is_doc_done(item_path, DOC_KINDS["backlog"]):
            issues.append(f"linked backlog item `{item_ref}` is not closed after finishing task `{task_ref}`")

        item_text = _strip_mermaid_blocks(item_path.read_text(encoding="utf-8"))
        request_refs = sorted(_extract_refs(item_text, "req"))
        if not request_refs:
            issues.append(f"linked backlog item `{item_ref}` has no request reference")
            continue

        for request_ref in request_refs:
            if request_ref in processed_request_refs:
                continue
            processed_request_refs.add(request_ref)
            request_path = _resolve_doc_path(repo_root, DOC_KINDS["request"], request_ref)
            if request_path is None:
                issues.append(f"backlog item `{item_ref}` references missing request `{request_ref}`")
                continue

            linked_items = _collect_docs_linking_ref(repo_root, DOC_KINDS["backlog"], request_ref)
            if linked_items and all(_is_doc_done(linked_item, DOC_KINDS["backlog"]) for linked_item in linked_items):
                if not _is_doc_done(request_path, DOC_KINDS["request"]):
                    issues.append(f"request `{request_ref}` should be closed because all linked backlog items are done")

    return issues


def _record_finished_task_follow_up(repo_root: Path, task_path: Path, dry_run: bool) -> None:
    task_ref = task_path.stem
    task_text = _strip_mermaid_blocks(task_path.read_text(encoding="utf-8"))
    item_refs = sorted(_extract_refs(task_text, "item"))
    request_refs: set[str] = set()

    for item_ref in item_refs:
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is None:
            continue
        item_text = _strip_mermaid_blocks(item_path.read_text(encoding="utf-8"))
        request_refs.update(_extract_refs(item_text, "req"))
        _append_section_bullets(
            item_path,
            "Notes",
            [f"- Task `{task_ref}` was finished via `logics-manager flow finish task` on {date.today().isoformat()}."],
            dry_run,
        )

    validation_bullets = [
        f"- Finish workflow executed on {date.today().isoformat()}.",
        "- Linked backlog/request close verification passed.",
    ]
    report_bullets = [
        f"- Finished on {date.today().isoformat()}.",
        f"- Linked backlog item(s): {', '.join(f'`{ref}`' for ref in item_refs) if item_refs else '(none)'}",
        f"- Related request(s): {', '.join(f'`{ref}`' for ref in sorted(request_refs)) if request_refs else '(none)'}",
    ]
    _append_section_bullets(task_path, "Validation", validation_bullets, dry_run)
    _append_section_bullets(task_path, "Report", report_bullets, dry_run)


def _maybe_close_request_chain(repo_root: Path, request_ref: str, dry_run: bool) -> None:
    request_path = _resolve_doc_path(repo_root, DOC_KINDS["request"], request_ref)
    if request_path is None:
        return

    linked_items = _collect_docs_linking_ref(repo_root, DOC_KINDS["backlog"], request_ref)
    if not linked_items:
        return

    if all(_is_doc_done(item_path, DOC_KINDS["backlog"]) for item_path in linked_items):
        if not _is_doc_done(request_path, DOC_KINDS["request"]):
            _close_doc(request_path, DOC_KINDS["request"], dry_run)
            print(f"Auto-closed request {request_ref} (all linked backlog items are done).")


def _close_chain_for_kind(repo_root: Path, source_path: Path, kind: DOC_KINDS, *, dry_run: bool) -> None:
    _close_doc(source_path, kind, dry_run)

    text = _strip_mermaid_blocks(source_path.read_text(encoding="utf-8"))
    processed_request_refs: set[str] = set()

    if kind.kind == "task":
        _mark_section_checkboxes_done(source_path, "Definition of Done (DoD)", dry_run)
        _record_finished_task_follow_up(repo_root, source_path, dry_run)

        linked_item_refs = sorted(_extract_refs(text, DOC_KINDS["backlog"].prefix))
        for item_ref in linked_item_refs:
            item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
            if item_path is None:
                continue
            linked_tasks = _collect_docs_linking_ref(repo_root, DOC_KINDS["task"], item_ref)
            if linked_tasks and all(_is_doc_done(task_path, DOC_KINDS["task"]) for task_path in linked_tasks):
                if not _is_doc_done(item_path, DOC_KINDS["backlog"]):
                    _close_doc(item_path, DOC_KINDS["backlog"], dry_run)
                    print(f"Auto-closed backlog item {item_ref} (all linked tasks are done).")

            item_text = _strip_mermaid_blocks(item_path.read_text(encoding="utf-8"))
            for request_ref in sorted(_extract_refs(item_text, DOC_KINDS["request"].prefix)):
                if request_ref in processed_request_refs:
                    continue
                processed_request_refs.add(request_ref)
                _maybe_close_request_chain(repo_root, request_ref, dry_run)

    if kind.kind == "backlog":
        for request_ref in sorted(_extract_refs(text, DOC_KINDS["request"].prefix)):
            if request_ref in processed_request_refs:
                continue
            processed_request_refs.add(request_ref)
            _maybe_close_request_chain(repo_root, request_ref, dry_run)

    if kind.kind == "request":
        _maybe_close_request_chain(repo_root, source_path.stem, dry_run)


def cmd_finish_task(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = Path(args.source).resolve()
    if not source_path.is_file():
        raise SystemExit(f"Source not found: {source_path}")
    if not source_path.stem.startswith(f"{DOC_KINDS['task'].prefix}_"):
        raise SystemExit(f"Expected a `{DOC_KINDS['task'].prefix}_...` task file. Got: {source_path.name}")

    _close_chain_for_kind(repo_root, source_path, DOC_KINDS["task"], dry_run=args.dry_run)

    if args.dry_run:
        payload = {"command": "finish", "kind": "task", "source": source_path.relative_to(repo_root).as_posix(), "dry_run": True}
        print("Dry run: skipped post-close verification.")
        return payload

    issues = _verify_finished_task_chain(repo_root, source_path)
    if issues:
        details = "\n".join(f"- {issue}" for issue in issues)
        raise SystemExit(f"Finish verification failed:\n{details}")

    payload = {"command": "finish", "kind": "task", "source": source_path.relative_to(repo_root).as_posix(), "dry_run": False}
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Finish verification: OK for {source_path.relative_to(repo_root)}")
    return payload


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command not in {"new", "promote", "split", "close", "finish"}:
        raise SystemExit("Unsupported flow subcommand for the native CLI slice.")
    payload = args.func(args)
    return 0 if isinstance(payload, dict) else 1
