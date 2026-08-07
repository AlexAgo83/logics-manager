from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import ConfigError, load_repo_config


REQUIRED_DIRECTORIES = ("logics/request", "logics/backlog", "logics/tasks")
SCHEMA_VERSION_PATTERN = re.compile(r"^\s*>\s*Schema version:\s*(.+?)\s*$", re.MULTILINE)
PACKAGE_LINE_PATTERN = re.compile(r'^\s*"([^"]+)"\s*,?\s*$')


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


def _check_duplicate_executables() -> list[DoctorIssue]:
    """Report several logics-manager executables on PATH.

    Two installs from different package managers means `--version` and an
    update can disagree about which copy they act on. This has happened twice
    in the field, each time after a self-update installed a second executable
    that shadowed the first.
    """
    from .cli import running_executable_path, shadowing_executables

    executable = running_executable_path()
    others = shadowing_executables(executable)
    if not others:
        return []
    return [
        DoctorIssue(
            code="duplicate_executables",
            path=str(executable) if executable else "logics-manager",
            message="Several logics-manager executables are on PATH: " + ", ".join(others),
            remediation=(
                "Keep one install. Inspect with `type -a logics-manager`, then remove the "
                "others (`pipx uninstall logics-manager`, `npm uninstall -g @grifhinz/logics-manager`)."
            ),
        )
    ]


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
        # Kept out of `issues`/`ok`: this is about the machine's install layout,
        # not the corpus, and folding it in would make a repo-level result vary
        # with the caller's PATH.
        "environment_warnings": [issue.to_dict() for issue in _check_duplicate_executables()],
    }
    return payload


def _declared_pyproject_packages(repo_root: Path) -> set[str]:
    pyproject = repo_root / "pyproject.toml"
    if not pyproject.is_file():
        return set()
    text = pyproject.read_text(encoding="utf-8")
    match = re.search(r"(?ms)^\[tool\.setuptools\]\s*^packages\s*=\s*\[(.*?)^\]", text)
    if not match:
        return set()
    packages: set[str] = set()
    for line in match.group(1).splitlines():
        package_match = PACKAGE_LINE_PATTERN.match(line)
        if package_match:
            packages.add(package_match.group(1))
    return packages


def _importable_checkout_packages(repo_root: Path) -> set[str]:
    """Directories that must be declared as packages in pyproject.toml.

    A directory whose name is not a valid Python identifier can never be an
    importable package, so declaring it would be meaningless -- setuptools ships
    it through the `package-data` globs instead. Asset directories named for
    readability (`skill_assets/groom-issues/`) are exactly that case, and
    flagging them was a false positive.
    """
    root = repo_root / "logics_manager"
    if not root.is_dir():
        return set()
    packages = {"logics_manager"}
    for path in root.rglob("*"):
        if not path.is_dir() or path.name == "__pycache__":
            continue
        if not any(child.is_file() for child in path.iterdir()):
            continue
        parts = path.relative_to(repo_root).parts
        if not all(part.isidentifier() for part in parts):
            continue
        packages.add(".".join(parts))
    return packages


def _clean_wheel_install_check(repo_root: Path) -> dict[str, Any]:
    with tempfile.TemporaryDirectory(prefix="logics-packaging-") as tmp:
        venv = Path(tmp) / "venv"
        create = subprocess.run([sys.executable, "-m", "venv", str(venv)], cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
        if create.returncode != 0:
            return {"ok": False, "step": "venv", "message": create.stderr.strip() or create.stdout.strip()}
        python = venv / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        install = subprocess.run([str(python), "-m", "pip", "install", str(repo_root)], cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
        if install.returncode != 0:
            return {"ok": False, "step": "install", "message": install.stderr.strip()[-1000:] or install.stdout.strip()[-1000:]}
        smoke = subprocess.run([str(python), "-m", "logics_manager", "--help"], cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
        return {
            "ok": smoke.returncode == 0,
            "step": "smoke",
            "message": "clean install smoke passed" if smoke.returncode == 0 else (smoke.stderr.strip() or smoke.stdout.strip()),
        }


def doctor_packaging_payload(repo_root: Path, *, clean_install: bool = True) -> dict[str, Any]:
    declared = _declared_pyproject_packages(repo_root)
    discovered = _importable_checkout_packages(repo_root)
    missing = sorted(discovered - declared)
    checks: list[dict[str, Any]] = [
        {
            "id": "metadata_subpackages",
            "status": "passed" if not missing else "failed",
            "message": "all checkout packages are declared" if not missing else "missing from pyproject.toml packages: " + ", ".join(missing),
        }
    ]
    if clean_install:
        result = _clean_wheel_install_check(repo_root)
        checks.append({"id": "clean_wheel_install", "status": "passed" if result["ok"] else "failed", "message": result["message"], "step": result["step"]})
    ok = all(check["status"] == "passed" for check in checks)
    return {
        "ok": ok,
        "command": "doctor packaging",
        "checks": checks,
        "declared_packages": sorted(declared),
        "discovered_packages": sorted(discovered),
        "missing_packages": missing,
        "clean_install": clean_install,
    }


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
    for warning in payload.get("environment_warnings", []):
        lines.append(f"- warning [{warning['code']}] {warning['message']}")
        lines.append(f"  remediation: {warning['remediation']}")
    return "\n".join(lines)


def render_doctor_packaging(repo_root: Path, *, clean_install: bool = True, output_format: str = "text") -> str:
    payload = doctor_packaging_payload(repo_root, clean_install=clean_install)
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)
    lines = ["Logics packaging doctor: OK" if payload["ok"] else "Logics packaging doctor: FAILED"]
    for check in payload["checks"]:
        lines.append(f"- {check['id']}: {check['status']} ({check['message']})")
    return "\n".join(lines)
