# Logics Manager 2.24.2

## Workflow execution records

- Add generic execution tables to request, backlog and task templates and the `flow record-run` command to create or update attempts by runner and run id.
- Calculate task progress from execution states with `--progress auto` and propagate it to linked backlog items.
- Include the newest 20 executions and older-row counts in bounded CLI and MCP reads and context packs.
- Validate execution tables in lint and audit, and flag a failed latest execution as needing attention.
