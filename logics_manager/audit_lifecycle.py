"""Lifecycle exceptions for delivery checks, preserving structural validation."""
from __future__ import annotations

from typing import TYPE_CHECKING

from .doc_parsing import extract_refs
from .executions import execution_audit_findings, parse_executions

if TYPE_CHECKING:
    from .audit import AuditIssue, DocMeta


def delivery_by_execution(doc: DocMeta) -> bool:
    """Trust recorded merged PR evidence only on explicitly Done requests."""
    if doc.kind.kind != "request" or doc.status != "done":
        return False
    try:
        return any(row["State"] == "merged" and row["PR"] for row in parse_executions(doc.text))
    except ValueError:
        return False


def execution_evidence_hint(doc: DocMeta) -> str:
    if doc.kind.kind != "request" or doc.status != "done":
        return ""
    return (
        "; alternatively, record delivery in # Executions with "
        "`logics-manager flow record-run <request-ref> --runner <runner> "
        "--run-id <id> --state merged --pr <merged-PR-URL>`"
    )


def obsolete_structure_issues(docs: dict[str, DocMeta], all_docs: dict[str, DocMeta]) -> list[AuditIssue]:
    """Abandoned work still needs valid execution tables and resolving doc links.

    Schema validation remains owned by lint, also consumed by flow validate.
    A historical failed execution does not require remediation on obsolete work.
    """
    from .audit import AuditIssue, REF_PREFIXES

    issues = []
    for doc in docs.values():
        if doc.status != "obsolete":
            continue
        for code, message in execution_audit_findings(doc.text):
            if code == "executions_invalid":
                issues.append(AuditIssue(code=code, path=doc.path, message=message))
        for prefix in REF_PREFIXES:
            for ref in sorted(extract_refs(doc.text, prefix)):
                if ref not in all_docs:
                    issues.append(AuditIssue(code="obsolete_refs_missing_target", path=doc.path, message=f"references missing target `{ref}`"))
    return issues
