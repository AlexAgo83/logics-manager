from __future__ import annotations

def _build_scaffold_request_doc(repo_root: Path, ref: str, title: str, input_payload: dict[str, object]) -> str:
    request = input_payload.get("request") if isinstance(input_payload.get("request"), dict) else {}
    from_version = _resolved_from_version(repo_root, _string_value(input_payload, "from_version", default=""))
    needs = _string_list(request, "needs", default=[f"Deliver {title.lower()} as a development-ready Logics workflow."])
    context = _string_list(request, "context", default=["Generated from structured request-chain scaffold input."])
    acceptance = _string_list(request, "acceptance_criteria", default=["AC1: The scaffolded workflow is ready for implementation."])
    references = _string_list(input_payload, "references", default=["`logics_manager/flow.py`"])
    product_title = _string_value(input_payload.get("product") if isinstance(input_payload.get("product"), dict) else {}, "title", default=title)
    return "\n".join(
        [
            f"## {ref} - {title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            "> Status: Draft",
            "> Understanding: 90%",
            "> Confidence: 85%",
            f"> Complexity: {_string_value(request, 'complexity', default='High')}",
            f"> Theme: {_string_value(request, 'theme', default='Operator workflow')}",
            "> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.",
            "",
            "# Needs",
            *_bullets_or_default(needs, f"Deliver {title.lower()}."),
            "",
            "# Context",
            *_bullets_or_default(context, "Generated from structured scaffold input."),
            "",
            "# Acceptance criteria",
            *[f"- {item}" for item in acceptance],
            "",
            "# Definition of Ready (DoR)",
            "- [x] Problem statement is explicit and user impact is clear.",
            "- [x] Scope boundaries (in/out) are explicit.",
            "- [x] Acceptance criteria are testable.",
            "- [x] Dependencies and known risks are listed.",
            "",
            "# Companion docs",
            f"- Product brief(s): `{_next_product_ref(repo_root, product_title)}`",
            "- Architecture decision(s): (none yet)",
            "",
            "# References",
            *[f"- {item}" for item in references],
            "",
            "# AI Context",
            f"- Summary: {title}",
            f"- Keywords: request-chain-scaffold, {title.lower()}, development-ready",
            f"- Use when: You need to implement or review the scaffolded workflow for {title}.",
            "- Skip when: The change is unrelated to this scaffolded request chain.",
            "",
            "# Backlog",
            "- none",
            "",
        ]
    ).rstrip() + "\n"


def _build_scaffold_product_doc(repo_root: Path, ref: str, request_ref: str, item_refs: list[str], task_ref: str, input_payload: dict[str, object]) -> str:
    product = input_payload.get("product") if isinstance(input_payload.get("product"), dict) else {}
    title = _string_value(product, "title", default=_string_value(input_payload, "title", default="Scaffolded product"))
    overview = _string_value(product, "overview", default=f"Development-ready workflow corpus for {title.lower()}.")
    goals = _string_list(product, "goals", default=["Make the generated corpus usable without transcript context."])
    non_goals = _string_list(product, "non_goals", default=["Automatically implementing generated tasks."])
    return "\n".join(
        [
            f"## {ref} - {title}",
            f"> Date: {date.today().isoformat()}",
            "> Status: Proposed",
            f"> Related request: `{request_ref}`",
            f"> Related backlog: {', '.join(f'`{item}`' for item in item_refs)}",
            f"> Related task: `{task_ref}`",
            "> Related architecture: (none yet)",
            "> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.",
            "",
            "# Overview",
            overview,
            "",
            "# Goals",
            *_bullets_or_default(goals, "Keep the generated corpus implementation-ready."),
            "",
            "# Non-goals",
            *_bullets_or_default(non_goals, "Automatically implementing generated tasks."),
            "",
            "# Scope and guardrails",
            "- In: scaffolded request, product, backlog, orchestration task, validation, and handoff context.",
            "- Out: unrelated workflow docs and implementation of generated tasks.",
            "",
            "# Key product decisions",
            "- Use structured input as the source of truth for generated docs.",
            "- Keep generated write paths local and repo-bounded.",
            "",
            "# Success signals",
            "- Generated docs pass lint and audit without broad manual rewrites.",
            "- Context-pack output can be handed to an implementation agent directly.",
            "",
            "# References",
            f"- Product back-reference: `{request_ref}`",
            f"- Task back-reference: `{task_ref}`",
            "",
        ]
    ).rstrip() + "\n"


def _build_scaffold_backlog_doc(repo_root: Path, ref: str, request_ref: str, product_ref: str, task_ref: str, item: dict[str, object]) -> str:
    title = _string_value(item, "title", default="Scaffolded backlog slice")
    problem = _string_list(item, "problem", default=[f"Deliver {title.lower()}."])
    scope_in = _string_list(item, "scope_in", default=["the bounded implementation slice"])
    scope_out = _string_list(item, "scope_out", default=["unrelated sibling slices"])
    acceptance = _string_list(item, "acceptance_criteria", default=["AC1: The slice is implementation-ready."])
    request_acs = [_normalize_ac_id(value) for value in _string_list(item, "request_acs", default=[])]
    if not request_acs:
        request_acs = [f"AC{idx}" for idx in range(1, len(acceptance) + 1)]
    ac_trace = [
        f"- request-{ac_id} -> This backlog slice. Proof: {acceptance[min(idx, len(acceptance) - 1)]}"
        for idx, ac_id in enumerate(request_acs)
    ]
    return "\n".join(
        [
            f"## {ref} - {title}",
            f"> From version: {_resolved_from_version(repo_root, None)}",
            "> Schema version: 1.0",
            "> Status: Ready",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Progress: 0%",
            f"> Complexity: {_string_value(item, 'complexity', default='Medium')}",
            f"> Theme: {_string_value(item, 'theme', default='Implementation delivery')}",
            "> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.",
            "",
            "# Problem",
            *_bullets_or_default(problem, f"Deliver {title.lower()}."),
            "",
            "# Scope",
            "- In:",
            *[f"  - {value}" for value in scope_in],
            "- Out:",
            *[f"  - {value}" for value in scope_out],
            "",
            "# Acceptance criteria",
            *[f"- {value}" for value in acceptance],
            "",
            "# AC Traceability",
            *ac_trace,
            "",
            "# Decision framing",
            "- Product framing: Not needed",
            "- Architecture framing: Not needed",
            "",
            "# Links",
            f"- Product brief(s): `{product_ref}`",
            "- Architecture decision(s): (none yet)",
            f"- Request: `{request_ref}`",
            f"- Primary task(s): `{task_ref}`",
            "",
            "# AI Context",
            f"- Summary: {title}",
            f"- Keywords: scaffolded-backlog, {title.lower()}, implementation-ready",
            f"- Use when: Implementing the scaffolded slice for {title}.",
            "- Skip when: The change belongs to another backlog slice.",
            "",
            "# Priority",
            "- Impact: High",
            "- Urgency: Medium",
            "",
        ]
    ).rstrip() + "\n"


def _build_scaffold_task_doc(repo_root: Path, ref: str, title: str, request_ref: str, product_ref: str, item_refs: list[str], input_payload: dict[str, object]) -> str:
    task = input_payload.get("orchestration_task") if isinstance(input_payload.get("orchestration_task"), dict) else {}
    title = _string_value(task, "title", default=title)
    steps = _string_list(task, "plan", default=["Review generated corpus.", "Promote or implement the first backlog slice.", "Validate and update workflow docs."])
    return "\n".join(
        [
            f"## {ref} - {title}",
            f"> From version: {_resolved_from_version(repo_root, None)}",
            "> Schema version: 1.0",
            "> Status: Ready",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Progress: 0%",
            "> Complexity: Medium",
            "> Theme: Implementation delivery",
            "> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.",
            "",
            "# Context",
            "- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.",
            "",
            "# Plan",
            *[f"- [ ] {idx}. {step}" for idx, step in enumerate(steps, start=1)],
            "- [ ] GATE: do not close until lint, audit, and scaffold validation pass.",
            "",
            "# Backlog",
            *[f"- `{item_ref}`" for item_ref in item_refs],
            "",
            "# Definition of Done (DoD)",
            "- [ ] Generated request, product, backlog, and task docs are present.",
            "- [ ] Context-pack handoff is available when requested.",
            "- [ ] Validation passes.",
            "",
            "# AC Traceability",
            "- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.",
            "- request-AC4 -> This task. Proof: optional context-pack handoff is supported.",
            "- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.",
            "- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.",
            "",
            "# Validation",
            "- Run `python3 -m logics_manager lint --require-status`.",
            "- Run scaffold command tests.",
            "",
            "# Report",
            "- Implementation complete.",
            "",
            "# AI Context",
            f"- Summary: {title}",
            "- Keywords: scaffolded-task, request-chain-scaffold, orchestration",
            "- Use when: Coordinating implementation of a scaffolded request chain.",
            "- Skip when: Working on one isolated sibling slice.",
            "",
            "# Links",
            f"- Request: `{request_ref}`",
            f"- Product brief(s): `{product_ref}`",
            "- Architecture decision(s): (none yet)",
            "",
        ]
    ).rstrip() + "\n"


def _build_split_orchestration_task_doc(repo_root: Path, ref: str, title: str, request_ref: str, item_refs: list[str], summary: str) -> str:
    return "\n".join(
        [
            f"## {ref} - {title}",
            f"> From version: {_resolved_from_version(repo_root, None)}",
            "> Schema version: 1.0",
            "> Status: Ready",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Progress: 0%",
            "> Complexity: Medium",
            "> Theme: Implementation delivery",
            "> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.",
            "",
            "# Context",
            f"- {summary or 'Coordinate the AC-aware split backlog items without implementing them directly.'}",
            "",
            "# Plan",
            "- [ ] 1. Review the generated backlog slices and request AC mapping.",
            "- [ ] 2. Promote or implement the next highest-priority slice.",
            "- [ ] 3. Keep validation and request traceability updated as slices close.",
            "",
            "# Backlog",
            *[f"- `{item_ref}`" for item_ref in item_refs],
            "",
            "# Definition of Done (DoD)",
            "- [ ] Generated backlog slices are linked and ready for implementation.",
            "- [ ] Slice ownership and next action are clear.",
            "- [ ] Validation passes.",
            "",
            "# AC Traceability",
            "- request-AC2 -> This task. Proof: orchestration task coordinates the AC-aware split.",
            "- request-AC6 -> This task. Proof: generated task keeps split work explicit and bounded.",
            "- request-AC7 -> This task. Proof: generated task is covered by split request tests.",
            "",
            "# Validation",
            "- Run `python3 -m logics_manager lint --require-status`.",
            "",
            "# Report",
            "- Implementation complete.",
            "",
            "# AI Context",
            f"- Summary: {title}",
            "- Keywords: ac-aware-split, orchestration-task, generated-task",
            "- Use when: Coordinating the generated backlog slices from an AC-aware request split.",
            "- Skip when: Implementing one individual backlog slice.",
            "",
            "# Links",
            f"- Request: `{request_ref}`",
            "- Product brief(s): (none yet)",
            "- Architecture decision(s): (none yet)",
            "",
        ]
    ).rstrip() + "\n"


def scaffold_request_chain_payload(repo_root: Path, input_path: Path, *, context_pack_out: str | None, dry_run: bool) -> dict[str, object]:
    input_payload = _read_json_object(input_path, label="request-chain input")
    title = _string_value(input_payload, "title")
    if not title:
        raise SystemExit("request-chain input requires `title`.")
    raw_items = input_payload.get("backlog_items")
    if not isinstance(raw_items, list) or not raw_items or any(not isinstance(item, dict) for item in raw_items):
        raise SystemExit("request-chain input requires non-empty `backlog_items` array of objects.")
    items = [item for item in raw_items if isinstance(item, dict)]
    product_payload = input_payload.get("product") if isinstance(input_payload.get("product"), dict) else {}
    task_payload = input_payload.get("orchestration_task") if isinstance(input_payload.get("orchestration_task"), dict) else {}

    request_ref = _plan_doc(repo_root, DOC_KINDS["request"].directory, DOC_KINDS["request"].prefix, title, dry_run=True).ref
    product_ref = _next_product_ref(repo_root, _string_value(product_payload, "title", default=title))
    task_ref = _next_task_ref(repo_root, _string_value(task_payload, "title", default=f"Orchestrate {title}"))
    existing_backlog_numbers = []
    backlog_dir = repo_root / "logics" / "backlog"
    if backlog_dir.is_dir():
        for path in backlog_dir.glob("item_*.md"):
            parts = path.stem.split("_", 2)
            if len(parts) >= 2 and parts[1].isdigit():
                existing_backlog_numbers.append(int(parts[1]))
    next_backlog_number = max(existing_backlog_numbers, default=0) + 1
    item_refs = [
        f"item_{next_backlog_number + idx - 1:03d}_{_slugify(_string_value(item, 'title', default=f'{title} slice {idx}'))}"
        for idx, item in enumerate(items, start=1)
    ]

    doc_paths = [
        repo_root / "logics" / "request" / f"{request_ref}.md",
        repo_root / "logics" / "product" / f"{product_ref}.md",
        repo_root / "logics" / "tasks" / f"{task_ref}.md",
        *[repo_root / "logics" / "backlog" / f"{item_ref}.md" for item_ref in item_refs],
    ]
    if not dry_run:
        _ensure_new_doc_paths_available(doc_paths)

    request_text = _build_scaffold_request_doc(repo_root, request_ref, title, input_payload)
    request_text = request_text.replace("- none\n", "".join(f"- `{item_ref}`\n" for item_ref in item_refs), 1)
    product_text = _build_scaffold_product_doc(repo_root, product_ref, request_ref, item_refs, task_ref, input_payload)
    task_text = _build_scaffold_task_doc(repo_root, task_ref, _string_value(task_payload, "title", default=f"Orchestrate {title}"), request_ref, product_ref, item_refs, input_payload)
    backlog_texts = [
        _build_scaffold_backlog_doc(repo_root, item_ref, request_ref, product_ref, task_ref, item)
        for item_ref, item in zip(item_refs, items)
    ]

    created_paths = [path.relative_to(repo_root).as_posix() for path in doc_paths]
    changed_files = [*created_paths, "logics/INDEX.md"]
    context_pack_payload: dict[str, object] | None = None
    context_pack_path: str | None = None
    raw_context_pack = input_payload.get("context_pack") if isinstance(input_payload.get("context_pack"), dict) else {}
    requested_out = context_pack_out or _string_value(raw_context_pack, "out", default="")
    if requested_out:
        _out_path, context_pack_path = resolve_repo_output_path(repo_root, requested_out, label="--context-pack")
        changed_files.append(context_pack_path)

    if not dry_run:
        for path, content in zip(doc_paths, [request_text, product_text, task_text, *backlog_texts]):
            _write_new_doc(path, content)
        index_payload(repo_root)
        if requested_out and context_pack_path is not None:
            out_path, _rel = resolve_repo_output_path(repo_root, requested_out, label="--context-pack")
            refs = ",".join([request_ref, *item_refs, task_ref])
            context_pack_payload = build_context_pack_payload(
                repo_root,
                refs,
                mode=_string_value(raw_context_pack, "mode", default="summary-only"),
                profile=_string_value(raw_context_pack, "profile", default="normal"),
                handoff=True,
            )
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(json.dumps(context_pack_payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return {
        "command": "scaffold",
        "kind": "request-chain",
        "input": input_path.relative_to(repo_root).as_posix() if input_path.is_relative_to(repo_root) else input_path.as_posix(),
        "request_ref": request_ref,
        "product_ref": product_ref,
        "backlog_refs": item_refs,
        "task_ref": task_ref,
        "created_refs": [request_ref, product_ref, *item_refs, task_ref],
        "created_paths": created_paths,
        "changed_files": sorted(dict.fromkeys(changed_files)),
        "context_pack_path": context_pack_path,
        "context_pack": context_pack_payload,
        "validation_suggestions": [
            "logics-manager lint --require-status",
            "logics-manager audit --legacy-cutoff-version 1.1.0 --group-by-doc",
            f"logics-manager flow validate {request_ref} {' '.join(item_refs)} {task_ref} --format json",
        ],
        "dry_run": dry_run,
        "next_actions": [
            f"Review `{task_ref}`.",
            f"Run `logics-manager sync context-pack {request_ref} {' '.join(item_refs)} {task_ref} --handoff --format json` if no context pack was written.",
            "Run lint/audit before implementation.",
        ],
        "next_action": f"Review `{task_ref}` and run lint/audit before implementation.",
    }


def cmd_scaffold_request_chain(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    input_candidate = Path(args.input)
    input_path = input_candidate if input_candidate.is_absolute() else repo_root / input_candidate
    payload = scaffold_request_chain_payload(repo_root, input_path, context_pack_out=args.context_pack, dry_run=args.dry_run)
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        action = "Would scaffold" if args.dry_run else "Scaffolded"
        print(f"{action} request chain: {payload['request_ref']}")
        for rel_path in payload["changed_files"]:
            print(f"- {rel_path}")
        print(f"Next action: {payload['next_action']}")
    return payload
