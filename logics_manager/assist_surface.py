from __future__ import annotations

from collections import Counter


def build_changed_surface_summary(changed_paths: list[str]) -> dict[str, object]:
    category_counter: Counter[str] = Counter()
    for path in changed_paths:
        normalized = path.replace("\\", "/")
        if normalized.startswith("clients/vscode/src/") or normalized.startswith("clients/shared-web/media/"):
            category_counter["plugin"] += 1
        elif normalized.startswith("logics_manager/"):
            category_counter["python-runtime"] += 1
        elif normalized.startswith("logics/"):
            category_counter["workflow-docs"] += 1
        elif normalized.startswith("tests/") or "/tests/" in normalized or normalized.startswith("tests/python/"):
            category_counter["tests"] += 1
        elif normalized.endswith(".md"):
            category_counter["docs"] += 1
        else:
            category_counter["other"] += 1
    primary = category_counter.most_common(1)[0][0] if category_counter else "clean"
    summary = {
        "clean": "No changed surface was detected.",
        "plugin": "The plugin surface is the dominant change area.",
        "python-runtime": "The native Python runtime is the dominant change area.",
        "workflow-docs": "Workflow documentation is the dominant change area.",
        "tests": "Tests are the dominant change area.",
        "docs": "Markdown documentation is the dominant change area.",
        "other": "Mixed repository changes are present.",
    }.get(primary, "Mixed repository changes are present.")
    return {
        "summary": summary,
        "primary_category": primary,
        "counts": dict(sorted(category_counter.items())),
        "changed_paths": changed_paths,
        "review_recommended": primary not in {"clean", "docs"} and bool(changed_paths),
    }
