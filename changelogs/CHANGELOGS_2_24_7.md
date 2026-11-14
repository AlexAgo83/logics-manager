# Logics Manager 2.24.7

Let one MCP server answer for every sibling repository. Release date: 2026-11-14.

## MCP across sibling repositories

Delivered in PR #68 (commit `0f643471da25fdfaacecab31873490be0f4ce23f`): Let one MCP server answer for every sibling repository.

- Target a discovered sibling repository with the optional `project` argument on every MCP tool, using its id or unique name from `list_projects`; reject targets outside the discovered set.
- Read status and health across sibling corpora with the read-only `fleet_status` and `fleet_health` tools, reporting repository failures inline without exposing the absolute root.
- Use `--dry-run-default` to preview writes unless a call explicitly passes `dry_run: false`.

## Maintenance

- Keep the README in its shared short shape and enforce it (commit `6c995eec5a31ea027bba72bdc629e6f614574646`): replace the appended execution-record details with a table link to `docs/cli.md`, document the README convention in `CONTRIBUTING.md`, and test its sections, length, and closing licence line.
- Align release declarations, lockfiles, and the README version badge for 2.24.7, and regenerate the aggregate changelog.
