"""The hand-written logics.yaml parser: the subset of YAML it accepts, read correctly."""

from __future__ import annotations

from pathlib import Path

import pytest

from logics_manager.config import ConfigError, load_repo_config, parse_simple_yaml
from logics_manager.insights import health_payload
from logics_manager.doc_io import write_doc
from logics_manager.sync import _read_text


def test_comments_after_values_are_dropped_but_hashes_inside_values_kept() -> None:
    parsed = parse_simple_yaml('a: "x" # quoted\nb: plain # bare\nc: http://h/p#frag\nd: \'y\'  # single\n')

    assert parsed == {"a": "x", "b": "plain", "c": "http://h/p#frag", "d": "y"}


def test_a_list_item_with_a_colon_but_no_key_is_a_scalar() -> None:
    parsed = parse_simple_yaml("hosts:\n  - http://x:1\n  - name: y\n")

    assert parsed == {"hosts": ["http://x:1", {"name": "y"}]}


def test_tab_indentation_is_rejected_rather_than_read_as_top_level() -> None:
    with pytest.raises(ConfigError, match="tab"):
        parse_simple_yaml("health:\n\tstale_after_days: 3\n")


def test_a_byte_order_mark_is_not_part_of_the_first_key(tmp_path: Path) -> None:
    (tmp_path / "logics").mkdir()
    (tmp_path / "logics.yaml").write_bytes(b"\xef\xbb\xbfhealth:\n  stale_after_days: 3\n")

    config, _ = load_repo_config(tmp_path)

    assert config["health"]["stale_after_days"] == 3
    assert "﻿health" not in config


def test_health_refuses_invalid_config(tmp_path: Path) -> None:
    (tmp_path / "logics").mkdir()
    (tmp_path / "logics.yaml").write_text("health:\n\tstale_after_days: 3\n", encoding="utf-8")

    with pytest.raises(ConfigError, match="tab"):
        health_payload(tmp_path)


def test_workflow_reader_strips_bom_and_writer_preserves_it(tmp_path: Path) -> None:
    path = tmp_path / "logics" / "request" / "req_001_bom.md"
    path.parent.mkdir(parents=True)
    path.write_bytes(b"\xef\xbb\xbf## req_001_bom - BOM\n> Status: Draft\n")

    text = _read_text(tmp_path, path)
    assert text.startswith("## req_001_bom")
    write_doc(path, text.replace("Draft", "Ready"))
    assert path.read_bytes().startswith(b"\xef\xbb\xbf## req_001_bom")
    assert b"> Status: Ready" in path.read_bytes()
