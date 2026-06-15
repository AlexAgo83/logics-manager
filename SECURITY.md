# Security Policy

## Supported Versions

Security fixes target the latest published release line.

| Version | Supported |
| --- | --- |
| 2.9.x | Yes |
| < 2.9 | No |

If a security issue affects an older line, upgrade to the latest release before
testing or reporting unless the issue is specifically about the upgrade path.

## Reporting a Vulnerability

Please do not open public issues for suspected vulnerabilities.

Use GitHub private vulnerability reporting or create a private security advisory
draft for this repository:

https://github.com/AlexAgo83/logics-manager/security/advisories/new

Include:

- affected version and installation path (`pipx`, PyPI, npm, VSIX, or source);
- operating system and Python/Node versions;
- reproduction steps with the smallest safe example;
- expected impact and whether the issue is local-only, LAN-exposed, MCP-related,
  or package-distribution related;
- any logs, stack traces, or proof-of-concept details needed to reproduce.

Do not include real secrets, bearer tokens, private repository content, or
unredacted customer data.

## Response Expectations

The maintainer will triage the report, confirm affected versions, and coordinate
a fix before public disclosure when appropriate. Security fixes are released
through the normal GitHub Release, npm, and PyPI publishing pipeline.

## Security Scope

`logics-manager` is local-first. The main security-sensitive surfaces are:

- the local browser viewer, especially `--lan` mode and its bearer-token gate;
- the MCP HTTP server and tunnel helpers;
- file/path handling for workflow documents and bounded previews;
- package artifacts published to GitHub Releases, npm, and PyPI.

The viewer and MCP server should only be exposed to networks and clients you
trust. Use bearer authentication for HTTP MCP access and avoid `--no-bearer`
outside short-lived local debugging.
