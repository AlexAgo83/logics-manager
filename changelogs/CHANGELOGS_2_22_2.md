# Logics Manager 2.22.2

A corrective release. `bootstrap` deleted the project's `.claude/` directory on every
run, taking user-owned settings with it. It now removes only the files Logics itself
generated, and the documentation says which ones.

## `bootstrap` no longer deletes your `.claude/` directory

Bootstrap's legacy cleanup listed `.claude/` as a whole among the paths older versions
had generated, and `shutil.rmtree`'d it on every run. For a repository that already used
Claude Code, that destroyed `settings.json`, `settings.local.json`, `projects/`, and
`worktrees/` -- untracked files, hard-deleted, not sent to the Trash and not recoverable
from git. Nothing in the README or the generated instructions announced it, because it
was never intended: the cleanup was meant for the bridge files bootstrap used to write,
and the parent directory was swept up with them.

The cleanup is now scoped to exactly those generated files -- `.claude/commands/logics-*.md`,
`.claude/agents/logics-*.md`, and `logics/skills/`. `.claude/commands/` and `.claude/agents/`
are removed only when taking a generated file out leaves them empty, and `.claude/` itself
only when both are gone and nothing else remains. Everything else under `.claude/` is left
untouched. The suite now asserts on the survival of a `settings.json` and a user-owned
agent rather than on the directory's disappearance.

Anyone who lost files to an earlier bootstrap should look for them in a Time Machine or
APFS snapshot (`tmutil listlocalsnapshots /`); they are not in git.

## What `bootstrap` touches, written down

The README and `docs/cli.md` now state what bootstrap creates, what it removes, and that
`--sync-harnesses` remains the one flag that writes outside the repository. `bootstrap --check`
still prints the planned creations and removals without applying them.
