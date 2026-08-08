"""Flag sections rendered from the parser that declares them.

Every help screen used to restate its flags by hand, beside the parser that actually
accepts them. The two drifted: nine flags across seven commands were accepted, carried
their own help text, and appeared on no screen -- including the one `lint` prints as its
own remediation. Rendering the section from the declaration removes the second place to
edit, so a flag cannot be added without appearing.

The rest of each screen stays hand-authored. A summary, a usage line, accepted values
and examples say things a flag list cannot.
"""

from __future__ import annotations

import argparse


def _is_flag(action: argparse.Action) -> bool:
    if not action.option_strings or isinstance(action, argparse._HelpAction):  # noqa: SLF001
        return False
    return any(option.startswith("--") for option in action.option_strings)


def _render(action: argparse.Action) -> str:
    name = next(option for option in action.option_strings if option.startswith("--"))
    if action.choices:
        return f"{name} {{{','.join(str(choice) for choice in action.choices)}}}"
    return name


def subparser_for(parser: argparse.ArgumentParser, path: list[str] | tuple[str, ...]) -> argparse.ArgumentParser:
    """Walk `parser` down `path`, e.g. ("repair", "gates")."""
    current = parser
    for name in path:
        actions = [
            action for action in current._actions  # noqa: SLF001 - argparse exposes no public accessor
            if isinstance(action, argparse._SubParsersAction)  # noqa: SLF001
        ]
        if not actions or name not in actions[0].choices:
            raise KeyError(f"No subcommand {name!r} under {' '.join(path)!r}")
        current = actions[0].choices[name]
    return current


def flag_lines(parser: argparse.ArgumentParser, *, indent: str = "  ") -> list[str]:
    """One flag per line, the shape the per-command screens use."""
    return [f"{indent}{_render(action)}" for action in parser._actions if _is_flag(action)]  # noqa: SLF001


def flag_summary(parser: argparse.ArgumentParser) -> str:
    """Comma-separated, the shape the grouped listings use."""
    return ", ".join(_render(action) for action in parser._actions if _is_flag(action))  # noqa: SLF001


def declared_flags(parser: argparse.ArgumentParser) -> set[str]:
    """Every long flag the command accepts, for tests that compare against a screen."""
    return {
        option
        for action in parser._actions  # noqa: SLF001
        if _is_flag(action)
        for option in action.option_strings
        if option.startswith("--")
    }
