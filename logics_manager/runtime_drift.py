"""Say when the running tool is not the tool this repository expects.

`logics-manager` usually resolves to a bundled install, so a repository at one
version can be inspected by a runtime at another and nothing says so. The failure
is one-sided, which is what makes it dangerous: an older runtime does not know
about newer checks, so it reports *fewer* findings. The corpus looks healthier
than it is, and the operator has no reason to look twice.

Observed 2026-08-11: `logics-manager audit` answered "0 blocking" from a 2.21.6
runtime on a 2.21.7 tree. The same corpus, run through `python3 -m logics_manager`,
reported 4 blocking findings and 234 warnings. A measurement taken from the first
answer was written into a request as acceptance proof before the disagreement
surfaced.

Informs, never gates: a deliberately pinned runtime has to stay usable, so this
touches no exit code and no `ok` flag.
"""

from __future__ import annotations

from pathlib import Path


def repository_version(repo_root: Path) -> str | None:
    """The version the repository declares, or None if it declares none."""
    version_file = repo_root / "VERSION"
    if not version_file.is_file():
        return None
    try:
        value = version_file.read_text(encoding="utf-8").strip()
    except OSError:
        return None
    return value or None


def drift_message(repo_root: Path, runtime_version: str | None) -> str | None:
    """A one-line notice when runtime and repository disagree, else None.

    Silent when either side declares no version: an unknown version is not a
    disagreement, and guessing would produce a warning nobody can act on.
    """
    declared = repository_version(repo_root)
    # `.strip()` before the emptiness test, not after: a whitespace-only version is
    # unknown, and treating it as known produced a notice naming no version at all.
    running = (runtime_version or "").strip()
    if not declared or not running:
        return None
    if declared == running:
        return None
    return (
        f"Runtime is logics-manager {running} but this repository is {declared}. "
        f"Findings below come from the runtime, so a newer repository may have checks it does not run. "
        f"Update with `npm install -g @grifhinz/logics-manager@{declared}`, "
        f"or run this repository's own code with `python3 -m logics_manager`."
    )
