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

- the local browser viewer, especially `--lan` (read-only) and `--lan-rw`
  (paired-device read/write) modes and their bearer-token gates;
- the MCP HTTP server and tunnel helpers;
- file/path handling for workflow documents and bounded previews;
- package artifacts published to GitHub Releases, npm, and PyPI.

The viewer and MCP server should only be exposed to networks and clients you
trust. Use bearer authentication for HTTP MCP access and avoid `--no-bearer`
outside short-lived local debugging.

### Viewer LAN auth model

The viewer enforces three independent checks before accepting a mutating
request on a LAN-exposed instance:

1. **Origin / Referer**: every non-loopback POST must carry an `Origin`
   (with `Referer` fallback) matching one of the URLs the viewer actually
   hands out — the bound host, the detected LAN IP, and the loopback
   names, scoped to the active scheme/port. This closes CSRF against any
   page hosted on the device.
2. **Bearer token**: the per-launch share token gates read access, and a
   per-device token (issued via the `--lan-rw` PIN handshake) gates write
   access. Both are compared with `hmac.compare_digest`. Device tokens
   are persisted only as SHA-256 hashes under
   `~/.cache/logics-manager/devices.json` (chmod 600). PINs are 6 digits,
   live 120 seconds, allow at most 5 attempts, and are single-use.
3. **Mode**: without `--lan-rw` every mutating endpoint returns 403, even
   with a valid token. `--lan-rw` requires the request to come from a
   paired device or from loopback.

Recommended setup for phone access: `--lan --lan-rw --tls` (auto-generates
a self-signed cert). For cross-network access prefer a Tailscale /
WireGuard tunnel over public exposure, even with TLS.
