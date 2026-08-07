[⬅ Back to README](../README.md) · [Documentation index](./README.md)

# MCP For Assistants

The MCP server is an assistant-facing adapter over the CLI. It is useful when a chat assistant should work with Logics documents without getting arbitrary filesystem or shell access.

The MCP surface can:

- create and promote workflow docs;
- create and list companion docs including product briefs, roadmaps, and ADRs;
- read, list, search, and build context packs from approved Logics docs;
- update controlled indicators and append bounded notes;
- finish or close workflow docs through canonical commands;
- run lint, audit, deterministic repairs, split operations, and Logics-scoped diffs.

`create_request` accepts optional provenance fields: `origin` (`human`, `agent`, or `github`), `external_url`, `external_id`, and `actor`. GitHub origins require an HTTPS GitHub issue URL and always record an approval checkpoint before implementation.

Inspect the exposed tools:

```bash
python3 -m logics_manager mcp tools
```

Run the local stdio server:

```bash
python3 -m logics_manager mcp serve --repo-root .
```

## Passing tool arguments

`mcp call` accepts its arguments from four sources, so structured data never has
to survive a shell quoting chain:

```bash
mcp call read_logics_doc --arguments '{"source": "req_001_example"}'   # inline
mcp call read_logics_doc --arguments @args.json                        # a file
mcp call read_logics_doc --arguments @-        < args.json             # stdin
mcp call list_logics_docs --arg kind=request --arg limit=5             # pairs
```

`--arg` values parse as JSON when they can, so `limit=5` is a number and
`dry_run=true` is a boolean; anything else stays a string. Pairs are merged over
`--arguments`, so a file can carry the bulk and a pair can override one field.

Prefer `@-` when driving the CLI over SSH or through another shell: the payload
travels on stdin instead of the command line.

## Output envelope

Under `--format json` (or `--json`), a failure returns JSON too:

```json
{"ok": false, "error": {"code": "command_failed", "message": "..."}}
```

The process exit code is zero exactly when `ok` is true. `health` follows this:
it used to always exit 0 while reporting `ok: false`, so a caller had to parse
the payload to notice a problem.

## Previewing a mutation

Every tool that is not `read-only` accepts `dry_run`. When set, nothing is
written and the response describes what would change, using one shape across
all of them:

```json
{
  "ok": true,
  "dry_run": true,
  "summary": "Would create request req_305_example",
  "planned_paths": ["logics/request/req_305_example.md"],
  "planned_refs": ["req_305_example"]
}
```

Omitting `dry_run` keeps each tool's existing default, which is to apply.
`autofix_ac_traceability` and `autofix_structure` have no underlying dry-run
mode, so their preview runs the audit without the repair flag and returns the
findings the repair would address, under the same keys plus `findings`.

## Bounding the served surface

Every tool carries a `capability`: `read-only`, `mutating` (creates or edits
documents), or `destructive` (removes a document or restructures the corpus
around it — `delete_logics_file`, `rename_logics_file`, `split_request`,
`split_backlog`).

`--profile` selects a capability level, `--allow-tools` adds name patterns on
top, and `--deny-tools` removes them. Deny always wins. All three are accepted
by `serve`, `serve-http`, `tools`, and `call`, and apply to every transport.

```bash
# a status glance: nothing can write
python3 -m logics_manager mcp serve --profile read-only

# everything except the destructive tools
python3 -m logics_manager mcp serve --profile curated

# read-only plus one capture tool
python3 -m logics_manager mcp serve --profile read-only --allow-tools create_request

# the full surface minus a specific family
python3 -m logics_manager mcp serve --deny-tools 'delete_*,rename_*'
```

The default is `--profile full`, which is the whole surface — unchanged from
before. A pattern that matches no tool is an error rather than a silent no-op,
and both server transports print the resolved surface to stderr at startup:

```
Logics MCP surface: profile=read-only tools=15/36
```

Calling a tool outside the selection returns an `unsupported_action` error
naming its capability and the active profile.

Run the local HTTP server for an HTTPS tunnel:

```bash
LOGICS_MCP_BEARER_TOKEN="$(openssl rand -hex 32)" python3 -m logics_manager mcp serve-http --repo-root . --host 127.0.0.1 --port 8765
```

`POST /mcp` accepts `Authorization: Bearer <token>` when `LOGICS_MCP_BEARER_TOKEN` or `--bearer-token` is set. Keep `/health` unauthenticated for smoke checks, but do not expose `/mcp` publicly without a bearer token.

Start the local server and a temporary `localtunnel` session in one command:

```bash
python3 -m logics_manager mcp tunnel --repo-root . --port 8765
```

For short-lived live debugging only, run without bearer auth:

```bash
python3 -m logics_manager mcp tunnel --repo-root . --port 8765 --no-bearer
```

During project development, the same commands can be run through the repository binary:

```bash
node scripts/npm/logics-manager.mjs mcp tunnel --repo-root . --port 8765
node scripts/npm/logics-manager.mjs mcp tunnel --repo-root . --port 8765 --no-bearer
```

Generate a local connector plan:

```bash
python3 -m logics_manager mcp connect --repo-root . --port 8765
```

With an HTTPS tunnel URL:

```bash
python3 -m logics_manager mcp connect --repo-root . --public-url https://example-tunnel.example --check
```

For a no-bearer plan:

```bash
python3 -m logics_manager mcp connect --repo-root . --public-url https://example-tunnel.example --no-bearer --check
```

The connector plan prints the bearer token when used, server command, tunnel target, assistant connector URL, auth mode, auth header, smoke checks, warnings, and cleanup steps.

## Assistant Model

The project is local-first:

- each operator runs the CLI and MCP server against their own repository;
- remote chat assistants connect through a short-lived HTTPS tunnel when needed;
- coding agents consume prepared tasks and run validations in the repo;
- shared GPTs or assistant configs can carry instructions, but each user keeps their own local connector URL and token.

This avoids a hosted multi-tenant Logics service while still allowing ChatGPT, Claude, Codex, or another MCP-capable assistant to work against the same workflow contract.
