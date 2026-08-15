# Logics Manager 2.22.1

The ChatGPT connector stops publishing anything. It now rides OpenAI's Secure MCP
Tunnel: `tunnel-client` runs on the machine, connects outbound, and drives
`logics-manager mcp serve` over stdio -- no public URL, no bearer token to paste, and a
tunnel ID that survives every stop and start. Alongside it, three Logics checks stopped
reading a document's status back as a defect.

## A connector you configure once, then switch on

Every restart used to hand the operator a new URL and a new token to paste into ChatGPT,
and left the machine publicly reachable for as long as it ran.
`adr_031_one_mcp_transport_per_client_class` replaced that with one transport per client
class, and the viewer now walks the whole path: `tunnel-client` is offered for install
through the official Homebrew tap on confirmation, the profile is created from a pasted
tunnel ID, and the control-plane key is typed into a masked field, written owner-only to
`~/.config/logics-manager/tunnel.env`, and checked against the control plane the moment
it is saved -- `tunnel-client doctor` only checks that the variable is set, and a key it
accepts can still repeat a 401 for as long as the daemon runs.

The five setup steps show in their real order with exactly one actionable at a time, and
the block disappears once they are all met. The last step flips to connected on the first
request ChatGPT actually makes, which is when an operator learns it worked rather than
hoping. Neither the tunnel ID nor the key reaches a versioned file, a project file, a log
line, or a screen.

The screen also names the transport each client class needs: the Secure MCP Tunnel for
ChatGPT, a copy-ready stdio command for clients that launch the server themselves, and
hosted web clients as not supported yet. The localtunnel path still starts when it is
asked for by name.

`tunnel-client` stays an optional external tool, exactly like the `npx localtunnel` the
older path shells out to: the suite asserts on the commands that would be built and never
invokes the binary, so CI needs no `brew install`.

## What the connector serves is now a decision

The command written into the tunnel-client profile passed no `--profile`, so ChatGPT got
`mcp serve`'s default -- `full`, including `delete_logics_file` and `rename_logics_file`.
It now serves `curated`: the 45 read and write tools needed to scope, build, validate and
close work, and none of the four destructive ones. A chat client that picks the wrong ref
costs an edit, not a document.

## The credentials belong to the machine, not the session

The config resolved through `$HOME`, so a viewer started from a sandboxed session named a
path inside that session -- and a key saved there was invisible to every other session on
the same machine. One connector serves the machine, so the account's home decides,
whoever moved the variable. `tunnel-client` keeps its own profile under `$HOME` too, so
the child now runs with it pinned the same way.

## The viewer tells the truth about the connector again

Settings' Connector toggle computed its state from a `state` field `/api/mcp-connector`
never sends -- it sends `running` -- so the switch read "unknown" whatever the connector
was doing. The detail screen fetched once per visit, leaving "Refresh status" as the only
way to see a tunnel that had already come up; it now polls itself until the outcome
lands.

A connector stopped on purpose is no longer reported as a failure, and a real failure is
no longer reported as `OnStop hook executed`: `tunnel-client`'s last lines are always
shutdown hooks, so its plain errors and levelled records are preferred over the noise. A
prerequisite check we cannot route is named rather than guessed at -- "Check again" used
to report a missing profile when the real failure was the health port, held by the
connector that was running. Prerequisites are no longer asked of a connector that is
already up, and a key that is already set can be replaced from the screen.

## Three checks that read the corpus as written

A request is Draft precisely because nobody has sliced it, so the audit no longer reports
`has ACs but no linked backlog items` against one -- and reports it exactly as before for
every other status. A chain running through an abandoned slice delivered nothing either:
two Obsolete items were reporting the task they were scaffolded under as Done, which put
six acceptance criteria due on a request nobody had started building.

Closeout now reads the request a task delivers from the sections where links are declared,
reusing the audit's own map rather than a second implementation. A prose sentence naming
another request no longer drags its acceptance criteria into someone else's closeout --
which had already cost four documents their direct pointers, since bending the prose was
the only way to keep the check quiet.
