"""req_323/item_669: two mechanical, behavior-preserving extractions.

`mcp.py`'s `TOOL_DEFINITIONS` and `flow/__init__.py`'s `--help` text builders
moved to their own modules with no behavior change. The real byte-for-byte
proof (tools/list output, every `--help` output) was run manually against
git-stashed before/after snapshots while implementing this; these tests are
the lightweight regression backstop that keeps failing if either extraction
is ever undone informally.
"""

from __future__ import annotations


def test_tool_definitions_moved_out_of_mcp_module() -> None:
    from logics_manager import mcp, mcp_tool_definitions

    assert mcp.TOOL_DEFINITIONS is mcp_tool_definitions.TOOL_DEFINITIONS
    assert not hasattr(mcp, "_tool_schema"), "the schema helper moved with the data it built"


def test_help_builders_moved_out_of_flow_module() -> None:
    from logics_manager import flow
    from logics_manager.flow import help_text

    assert flow._build_new_help is help_text._build_new_help
    assert flow._build_progress_kind_help is help_text._build_progress_kind_help
    # help_flags primitives are no longer imported directly into flow/__init__.py -
    # only help_text.py needs them now.
    assert not hasattr(flow, "flag_lines")
    assert not hasattr(flow, "subparser_for")


def test_flow_help_text_can_resolve_the_parser_it_needs_without_a_circular_import() -> None:
    from logics_manager.flow.help_text import _flow_flag_lines

    lines = _flow_flag_lines(["new", "request"])
    assert any("--title" in line for line in lines)
