[Back to README](../README.md) · [Documentation index](./README.md)

# GitHub Issues bridge

Logics is the canonical workflow after a request is accepted. GitHub Issues is an optional intake and external-discussion channel.

## Intake

Create these repository labels once before enabling the forms: `type:bug`, `type:request`, `logics:triage`, `logics:accepted`, `logics:in-progress`, `logics:delivered`, and `logics:declined`. The bundled forms add `logics:triage`. Adding that label explicitly runs the intake workflow, which creates a Logics request on a branch and opens a PR. Review the PR before merging or promoting the request.

Issue content is untrusted. The bridge records it as context; it never executes it or starts implementation.

## AI requests

Agents use MCP `create_request` with `origin`, optional `external_url`, and `actor`. GitHub-originated requests require an HTTPS GitHub issue URL. Every created request records an approval checkpoint before implementation.

## Lifecycle feedback

Run `Logics issue update` manually to post `accepted`, `in-progress`, `delivered`, or `declined`. It updates only a label and one comment; Logics does not mirror GitHub discussions.

## Credentials

The workflow uses the ephemeral `GITHUB_TOKEN` with contents, pull-request, and issue write permissions. Do not add a personal access token for normal operation.
