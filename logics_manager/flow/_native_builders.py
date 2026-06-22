from __future__ import annotations

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
            "- Impact:",
            "- Urgency:",
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
            "# AC Traceability",
            "- request-AC1 -> This task. Proof: implementation delivers the bounded request need.",
            "- request-AC2 -> This task. Proof: implementation scope is limited to the linked delivery slice.",
            "- request-AC3 -> This task. Proof: implementation is executable from the promoted backlog item.",
            "- backlog-AC1 -> This task. Proof: task remains bounded to the linked backlog scope.",
            "- backlog-AC2 -> This task. Proof: task provides the executable implementation surface.",
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
    return content


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
