[⬅ Back to README](../README.md) · [Documentation index](./README.md)

# MCP For Assistants

The MCP server is an assistant-facing adapter over the CLI. It is useful when a chat assistant should work with Logics documents without getting arbitrary filesystem or shell access.

The MCP surface can:

- create and promote workflow docs;
- read, list, search, and build context packs from approved Logics docs;
- update controlled indicators and append bounded notes;
- finish or close workflow docs through canonical commands;
- run lint, audit, deterministic repairs, split operations, and Logics-scoped diffs.

Inspect the exposed tools:

```bash
python3 -m logics_manager mcp tools
```

Run the local stdio server:

```bash
python3 -m logics_manager mcp serve --repo-root .
```

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
