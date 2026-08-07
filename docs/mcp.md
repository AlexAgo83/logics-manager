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
