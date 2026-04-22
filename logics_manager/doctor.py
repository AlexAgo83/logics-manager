from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import ConfigError, load_repo_config


REQUIRED_DIRECTORIES = ("logics/request", "logics/backlog", "logics/tasks")
SCHEMA_VERSION_PATTERN = re.compile(r"^\s*>\s*Schema version:\s*(.+?)\s*$", re.MULTILINE)


@dataclass(frozen=True)
class DoctorIssue:
    code: str
    path: str
    message: str
    remediation: str

    def to_dict(self) -> dict[str, str]:
        return {
            "code": self.code,
            "path": self.path,
            "message": self.message,
            "remediation": self.remediation,
        }


def _check_required_directories(repo_root: Path) -> list[DoctorIssue]:
    issues: list[DoctorIssue] = []
    for relative in REQUIRED_DIRECTORIES:
        candidate = repo_root / relative
        if candidate.is_dir():
            continue
        issues.append(
            DoctorIssue(
                code="missing_directory",
                path=relative,
                message=f"Missing required directory `{relative}`.",
                remediation=f"Create `{relative}` or bootstrap the Logics workflow corpus.",
            )
        )
    return issues


def _check_schema_versions(repo_root: Path) -> list[DoctorIssue]:
    issues: list[DoctorIssue] = []
    for directory in REQUIRED_DIRECTORIES:
        candidate_dir = repo_root / directory
        if not candidate_dir.is_dir():
            continue
        for doc_path in sorted(candidate_dir.glob("*.md")):
            try:
                text = doc_path.read_text(encoding="utf-8")
            except Exception as exc:  # pragma: no cover - defensive filesystem guard
                issues.append(
                    DoctorIssue(
                        code="unreadable_doc",
                        path=doc_path.relative_to(repo_root).as_posix(),
                        message=f"Could not read workflow doc: {exc}",
                        remediation="Fix the file permissions or remove the broken file.",
                    )
                )
                continue
            if SCHEMA_VERSION_PATTERN.search(text):
                continue
            issues.append(
                DoctorIssue(
                    code="missing_schema_version",
                    path=doc_path.relative_to(repo_root).as_posix(),
                    message="Workflow doc is missing a schema version indicator.",
                    remediation="Add `> Schema version: 1.0` near the top of the document.",
                )
            )
    return issues


def doctor_payload(repo_root: Path) -> dict[str, Any]:
    issues: list[DoctorIssue] = []
    issues.extend(_check_required_directories(repo_root))

    config_path = None
    try:
        _config, config_path = load_repo_config(repo_root)
    except ConfigError as exc:
        issues.append(
            DoctorIssue(
                code="invalid_config",
                path="logics.yaml",
                message=str(exc),
                remediation="Fix `logics.yaml` so the runtime config can be parsed.",
            )
        )

    issues.extend(_check_schema_versions(repo_root))
    payload = {
        "ok": not issues,
        "issue_count": len(issues),
        "issues": [issue.to_dict() for issue in issues],
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        "workflow_doc_count": sum(1 for directory in REQUIRED_DIRECTORIES for _ in (repo_root / directory).glob("*.md") if (repo_root / directory).is_dir()),
        "missing_schema_version_count": sum(1 for issue in issues if issue.code == "missing_schema_version"),
    }
    return payload


def render_doctor(repo_root: Path, *, output_format: str = "text") -> str:
    payload = doctor_payload(repo_root)
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)

    lines = [
        "Logics doctor: OK" if payload["ok"] else "Logics doctor: FAILED",
        f"Workflow docs inspected: {payload['workflow_doc_count']}",
    ]
    if payload["issues"]:
        max_issues = 10
        for issue in payload["issues"][:max_issues]:
            lines.append(f"- [{issue['code']}] {issue['path']}: {issue['message']}")
            lines.append(f"  remediation: {issue['remediation']}")
        remaining = len(payload["issues"]) - max_issues
        if remaining > 0:
            lines.append(f"... and {remaining} more issue(s).")
    return "\n".join(lines)
