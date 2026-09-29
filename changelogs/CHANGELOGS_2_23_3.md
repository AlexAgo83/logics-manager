# Logics Manager 2.23.3

A corrective release updating the test harness and patching transitive security advisories.

## Maintenance

Vitest and its V8 coverage integration are upgraded from 4.1.11 to 5.0.2 (major).
Node types are updated from 20 to 22 to match the new peer requirement.

Two transitive security overrides are tightened:

- `fast-uri` 3.1.6 → 3.1.8 (GHSA-qw65-cvwx-89v3, GHSA-58mr-gqgx-xq4g — authority
  injection via unvalidated port and host confusion via unclosed bracket)
- `undici` 7.29.0 → 7.30.0 (GHSA-3wwx-pv8p-q78v — denial of service via
  unhandled error in WebSocket permessage-deflate decompression)
