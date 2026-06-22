from __future__ import annotations

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


def _update_product_delivery_links(
    product_path: Path,
    *,
    request_ref: str,
    backlog_ref: str,
    task_ref: str,
    dry_run: bool,
) -> None:
    if dry_run:
        return
    lines = product_path.read_text(encoding="utf-8").splitlines()
    lines = _replace_indicator_line(lines, "Related request", f"`{request_ref}`")
    lines = _replace_indicator_line(lines, "Related backlog", f"`{backlog_ref}`")
    lines = _replace_indicator_line(lines, "Related task", f"`{task_ref}`")
    lines = _replace_or_append_prefixed_section_bullet(lines, "References", "Product back-reference", f"`{backlog_ref}`")
    lines = _replace_or_append_prefixed_section_bullet(lines, "References", "Task back-reference", f"`{task_ref}`")
    product_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


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
            f"Logics should keep a single, predictable product surface for {title.lower()}.",
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
            _write_new_doc(adr_path, adr_content)
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
            _write_new_doc(product_path, product_content)
        created_product_refs.append(product_ref)

    return created_product_refs, created_architecture_refs


def _resolve_workflow_refs_for_companion(
    source_ref: str | None,
    *,
    request_ref: str | None = None,
    backlog_ref: str | None = None,
    task_ref: str | None = None,
) -> tuple[str | None, str | None, str | None]:
    resolved_request = request_ref
    resolved_backlog = backlog_ref
    resolved_task = task_ref

    if source_ref:
        if source_ref.startswith(f"{DOC_KINDS['request'].prefix}_"):
            resolved_request = source_ref
        elif source_ref.startswith(f"{DOC_KINDS['backlog'].prefix}_"):
            resolved_backlog = source_ref
        elif source_ref.startswith(f"{DOC_KINDS['task'].prefix}_"):
            resolved_task = source_ref
        else:
            raise SystemExit(
                "Unsupported --source-ref value. Expected a request, backlog, or task ref such as "
                "`req_001_demo`, `item_001_demo`, or `task_001_demo`."
            )

    return resolved_request, resolved_backlog, resolved_task


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
