

def _select_backend(requested_backend: str | None, bridge_status: dict[str, object]) -> tuple[str, list[str]]:
    if requested_backend and requested_backend != "auto":
        return requested_backend, []
    if bridge_status.get("available"):
        return "codex", ["global Claude runtime published"]
    return "deterministic", ["no global Claude runtime published"]


def _workflow_docs(repo_root: Path) -> list[Path]:
    docs: list[Path] = []
    for directory in ("request", "backlog", "tasks"):
        docs.extend(sorted((repo_root / "logics" / directory).glob("*.md")))
    return docs


def _resolve_workflow_doc(repo_root: Path, ref: str) -> Path | None:
    for path in _workflow_docs(repo_root):
        if path.stem == ref or path.name == f"{ref}.md":
            return path
    return None


def _doc_status(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("> Status:"):
            return stripped.split(":", 1)[1].strip()
    return "Unknown"


def _extract_doc_links(path: Path) -> list[str]:
    links: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("- "):
            candidate = stripped[2:].strip().strip("`")
            if candidate:
                links.append(candidate)
    return links


def _build_next_step(repo_root: Path, ref: str | None) -> dict[str, object]:
    if ref:
        doc_path = _assist._resolve_workflow_doc(repo_root, ref)
        if doc_path is not None:
            kind = doc_path.parent.name
            status = _doc_status(doc_path)
            if kind == "request":
                if status.lower() in {"draft", "ready"}:
                    action = "promote request to backlog"
                    rationale = "The request is ready to be split into bounded backlog slices."
                    checklist = [
                        f"Run `python3 -m logics_manager flow promote request-to-backlog {doc_path.relative_to(repo_root).as_posix()}`.",
                        "Validate the generated backlog slice for scope and acceptance criteria.",
                    ]
                else:
                    action = "review request status"
                    rationale = "The request is not in a promotion-friendly state yet."
                    checklist = [
                        "Inspect the request status and linked backlog coverage.",
                        "Resolve any missing indicators before promotion.",
                    ]
            elif kind == "backlog":
                if status.lower() in {"draft", "ready"}:
                    action = "promote backlog to task"
                    rationale = "The backlog item is ready to become an executable task."
                    checklist = [
                        f"Run `python3 -m logics_manager flow promote backlog-to-task {doc_path.relative_to(repo_root).as_posix()}`.",
                        "Confirm the task scope remains bounded and executable.",
                    ]
                else:
                    action = "review backlog status"
                    rationale = "The backlog item is not ready for task promotion yet."
                    checklist = [
                        "Inspect the backlog status and task linkage.",
                        "Resolve any missing indicators before promotion.",
                    ]
            else:
                action = "finish task"
                rationale = "Tasks are usually the last step in the Logics chain."
                checklist = [
                    f"Run `python3 -m logics_manager flow finish task {doc_path.relative_to(repo_root).as_posix()}`.",
                    "Verify the linked backlog and request moved to Done if appropriate.",
                ]
            return {
                "ref": ref,
                "doc_path": doc_path.relative_to(repo_root).as_posix(),
                "kind": kind,
                "status": status,
                "action": action,
                "rationale": rationale,
                "checklist": checklist,
                "confidence": 0.92,
            }
    return {
        "ref": ref,
        "doc_path": None,
        "kind": None,
        "status": None,
        "action": "run validation-summary",
        "rationale": "No target doc was resolved, so the safest next step is to inspect repository validation health.",
        "checklist": [
            "Run `python3 -m logics_manager assist validation-summary`.",
            "Then decide whether the next step is a request promotion, backlog promotion, or task finish.",
        ],
        "confidence": 0.74,
    }


def _build_closure_summary(repo_root: Path, ref: str | None) -> dict[str, object]:
    if not ref:
        return {
            "ref": None,
            "doc_path": None,
            "kind": None,
            "status": None,
            "summary": "No target doc was provided.",
            "delivered": [],
            "validations": [],
            "remaining_risks": ["Resolve the target doc reference first."],
            "confidence": 0.6,
        }
    doc_path = _assist._resolve_workflow_doc(repo_root, ref)
    if doc_path is None:
        return {
            "ref": ref,
            "doc_path": None,
            "kind": None,
            "status": None,
            "summary": "Target doc could not be resolved.",
            "delivered": [],
            "validations": [],
            "remaining_risks": [f"Unknown workflow ref `{ref}`."],
            "confidence": 0.55,
        }
    kind = doc_path.parent.name
    status = _doc_status(doc_path)
    title = next((line.split(" - ", 1)[1].strip() for line in doc_path.read_text(encoding="utf-8").splitlines() if line.startswith("## ")), doc_path.stem)
    links = _extract_doc_links(doc_path)
    delivered = [f"{kind} doc `{doc_path.stem}`", f"title: {title}", f"status: {status}"]
    validations = [
        "Check that the linked request/backlog/task chain is complete.",
        "Run the relevant lint/doctor validation before treating the closure as final.",
    ]
    remaining_risks: list[str] = []
    if status.lower() != "done":
        remaining_risks.append("The doc is not marked Done yet.")
    if not links:
        remaining_risks.append("No linked workflow references were found in the document.")
    return {
        "ref": ref,
        "doc_path": doc_path.relative_to(repo_root).as_posix(),
        "kind": kind,
        "status": status,
        "summary": f"{kind.title()} closure summary for {title}.",
        "delivered": delivered,
        "validations": validations,
        "remaining_risks": remaining_risks or ["No obvious remaining risks detected from the local doc shape."],
        "linked_refs": links,
        "confidence": 0.9 if status.lower() == "done" else 0.76,
    }


def _build_context_pack(repo_root: Path, seed_ref: str, *, mode: str, profile: str) -> dict[str, object]:
    docs = _workflow_docs(repo_root)
    selected: list[Path] = []
    for path in docs:
        text = path.read_text(encoding="utf-8")
        if seed_ref in path.stem or seed_ref in text:
            selected.append(path)
    if not selected:
        selected = docs[:4]
    selected = selected[: {"tiny": 2, "normal": 4, "deep": 8}.get(profile, 4)]
    return {
        "ref": seed_ref,
        "mode": mode,
        "profile": profile,
        "budgets": {"max_docs": {"tiny": 2, "normal": 4, "deep": 8}.get(profile, 4)},
        "changed_paths": [],
        "docs": [
            {
                "ref": path.stem,
                "path": path.relative_to(repo_root).as_posix(),
                "kind": path.parent.name,
                "title": path.read_text(encoding="utf-8").splitlines()[0].replace("#", "").strip() if path.read_text(encoding="utf-8").splitlines() else path.stem,
            }
            for path in selected
        ],
        "estimates": {
            "doc_count": len(selected),
            "char_count": sum(len(path.read_text(encoding="utf-8")) for path in selected),
        },
    }
