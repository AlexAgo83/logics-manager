"""Where viewer preferences are kept, and at what scope.

They used to live in one browser storage entry. Browser storage is scoped to an origin,
and an origin includes the port -- so the extension, which serves the viewer on an
ephemeral port, opened an empty store every session and nothing an operator set survived.
Nothing was corrupted; it was filed under a name that changed.

The server is the one party that knows both the repository it serves and the machine it
runs on, and it serves both the standalone viewer and the extension. So the record lives
here, at two scopes:

* **operator** -- what describes the person: their favourites, the projects they last
  opened, whether the workshop uses the system terminal, how often the viewer refreshes.
  One file per machine, shared by every window and by the standalone viewer.
* **repository** -- what describes a corpus: the workshop tab it was left on, the cdx
  columns and filters chosen for it. One file per repository, so opening another project
  does not inherit them.

The browser store stays, as a cache for the first paint. It is no longer the record.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

#: What describes the operator, not the corpus. Anything not listed is repository-scoped.
OPERATOR_FIELDS = frozenset(
    {
        "favoriteProjects",
        "projectLastUsedAt",
        "workshopUseSystemTerminal",
        "workshopRunbookShowHidden",
        "autoRefreshIntervalSeconds",
        "fleetRoots",
    }
)
#: Fields that are sets rather than values: two windows writing at once must not lose an
#: entry, so these are merged on write instead of replaced.
MERGED_FIELDS = frozenset({"favoriteProjects"})

PREFERENCES_VERSION = 1


def operator_preferences_path() -> Path:
    override = os.environ.get("LOGICS_VIEWER_PREFERENCES_HOME")
    base = Path(override) if override else Path.home() / ".config" / "logics-manager"
    return base / "viewer-preferences.json"


def repo_preferences_path(repo_root: Path) -> Path:
    return repo_root / "logics" / ".cache" / "viewer-preferences.json"


def _read(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return payload.get("preferences", {}) if isinstance(payload, dict) else {}


def _write(path: Path, preferences: dict[str, Any]) -> None:
    """Replace atomically: a crash mid-write must leave the previous content readable."""
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"version": PREFERENCES_VERSION, "preferences": preferences}
    handle = tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, prefix=path.name, suffix=".tmp", delete=False
    )
    try:
        with handle as stream:
            json.dump(payload, stream, indent=2, sort_keys=True)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(handle.name, path)
    except BaseException:
        Path(handle.name).unlink(missing_ok=True)
        raise


def split_scopes(patch: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    operator = {key: value for key, value in patch.items() if key in OPERATOR_FIELDS}
    repo = {key: value for key, value in patch.items() if key not in OPERATOR_FIELDS}
    return operator, repo


def _merge(stored: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    """Last writer wins for a value; a set is merged.

    Overwriting a set wholesale is how starring a project in one window dropped what
    another window had starred. A single value has no such problem, and inventing a
    conflict rule for it would buy complexity for nothing.
    """
    merged = dict(stored)
    for key, value in patch.items():
        if key in MERGED_FIELDS and isinstance(value, list):
            previous = stored.get(key)
            union = set(previous if isinstance(previous, list) else []) | set(value)
            merged[key] = sorted(str(entry) for entry in union if entry)
        else:
            merged[key] = value
    return merged


def read_preferences(repo_root: Path) -> dict[str, Any]:
    """Everything the viewer should start with, both scopes flattened as the client sees it."""
    return {**_read(repo_preferences_path(repo_root)), **_read(operator_preferences_path())}


def fleet_roots() -> list[Path]:
    """Return the operator's bounded fleet roots, ignoring stale entries."""
    roots = _read(operator_preferences_path()).get("fleetRoots", [])
    if not isinstance(roots, list):
        return []
    return list(dict.fromkeys(Path(str(root)).expanduser().resolve() for root in roots if Path(str(root)).expanduser().is_dir()))


def update_preferences(repo_root: Path, patch: dict[str, Any], *, removed: dict[str, Any] | None = None) -> dict[str, Any]:
    """Apply `patch`, and remove `removed` entries from the merged sets.

    Un-starring cannot be expressed by a merge -- the whole point of merging is that an
    absent entry means "I did not see it", not "drop it" -- so a removal says so.
    """
    operator_patch, repo_patch = split_scopes(patch)
    operator_removed, _repo_removed = split_scopes(removed or {})

    if operator_patch or operator_removed:
        path = operator_preferences_path()
        stored = _merge(_read(path), operator_patch)
        for key, value in operator_removed.items():
            if key in MERGED_FIELDS and isinstance(value, list):
                stored[key] = sorted(set(stored.get(key) or []) - {str(entry) for entry in value})
        _write(path, stored)

    if repo_patch:
        path = repo_preferences_path(repo_root)
        _write(path, _merge(_read(path), repo_patch))

    return read_preferences(repo_root)
