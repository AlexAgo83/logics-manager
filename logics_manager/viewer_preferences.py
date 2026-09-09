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


PREFERENCES_FILE_NAME = "viewer-preferences.json"


def operator_preferences_path() -> Path:
    override = os.environ.get("LOGICS_VIEWER_PREFERENCES_HOME")
    base = Path(override) if override else Path.home() / ".config" / "logics-manager"
    return base / PREFERENCES_FILE_NAME


def _account_home() -> Path | None:
    """The account's own home, as the system records it, ignoring $HOME.

    item_885: `Path.home()` reads $HOME, so a process launched with $HOME pointed
    elsewhere -- which is how agent tool profiles run -- opens a different record
    without saying so. The passwd entry is the one home that does not move, so
    comparing the two is what makes a forked store detectable without scanning.
    """
    try:
        import pwd
    except ImportError:  # Windows has no pwd module; $HOME is the only answer there.
        return None
    try:
        return Path(pwd.getpwuid(os.getuid()).pw_dir)
    except (KeyError, OSError):
        return None


def operator_preferences_stores() -> dict[str, Any]:
    """Which operator record is in use, and which others exist for this account.

    Reports rather than repairs: nothing here moves, merges or deletes a store.
    """
    active = operator_preferences_path()
    candidates: list[Path] = []
    for base in (Path.home() / ".config" / "logics-manager", _account_home()):
        if base is None:
            continue
        candidate = (base if base.name == "logics-manager" else base / ".config" / "logics-manager") / PREFERENCES_FILE_NAME
        candidates.append(candidate)
    seen = {_resolved(active)}
    others: list[str] = []
    for candidate in candidates:
        key = _resolved(candidate)
        if key in seen or not candidate.is_file():
            continue
        seen.add(key)
        others.append(str(candidate))
    return {
        "path": str(active),
        "exists": active.is_file(),
        "others": others,
        "overridden": bool(os.environ.get("LOGICS_VIEWER_PREFERENCES_HOME")),
    }


def _resolved(path: Path) -> str:
    try:
        return str(path.resolve())
    except OSError:
        return str(path)


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


def fleet_roots(*, include_missing: bool = False) -> list[Path]:
    """Return the operator's bounded fleet roots, ignoring stale entries.

    item_881: `include_missing` is what a *write* reads. Rewriting the list from the
    filtered view silently dropped a root that was merely unreachable at that moment --
    an unmounted volume, a folder macOS had not granted access to yet -- so adding one
    root deleted the others. Reads still hide what is not there.
    """
    roots = _read(operator_preferences_path()).get("fleetRoots", [])
    if not isinstance(roots, list):
        return []
    resolved: list[Path] = []
    for entry in roots:
        candidate = Path(str(entry)).expanduser()
        if not include_missing and not candidate.is_dir():
            continue
        try:
            resolved.append(candidate.resolve())
        except OSError:
            continue
    return list(dict.fromkeys(resolved))


#: What adoption carries across: the sets that describe the operator's working context.
#: Scalars are left alone -- a refresh interval chosen here is not improved by one chosen
#: in another profile, and overwriting it would be the silent replacement adr_033 refuses.
ADOPTABLE_FIELDS = ("favoriteProjects", "fleetRoots")


def adopt_preferences(repo_root: Path, source: Path) -> dict[str, Any]:
    """Merge a forked operator record into the active one (adr_033).

    Additive by construction: a union of the adoptable sets, so adoption can be
    repeated, cannot remove a favourite, and never touches the source file.
    Raises ValueError if `source` is not one of the records this account actually has,
    which is what keeps the route from reading an arbitrary path.
    """
    stores = operator_preferences_stores()
    if _resolved(source) not in {_resolved(Path(path)) for path in stores["others"]}:
        raise ValueError("Unknown operator preferences file.")
    incoming = _read(source)
    patch: dict[str, Any] = {}
    for field in ADOPTABLE_FIELDS:
        values = incoming.get(field)
        if not isinstance(values, list):
            continue
        current = _read(operator_preferences_path()).get(field)
        union = [str(entry) for entry in (current if isinstance(current, list) else [])]
        union.extend(str(entry) for entry in values if str(entry) not in union)
        if union:
            patch[field] = union
    if not patch:
        return read_preferences(repo_root)
    return update_preferences(repo_root, patch)


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
