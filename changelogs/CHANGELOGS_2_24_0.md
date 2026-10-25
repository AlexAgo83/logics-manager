# Logics Manager 2.24.0

This release adds fleet planning and review workflows, improves workflow integrity, and strengthens the viewer and HTTP MCP surfaces.

## Fleet and review workflows

- Fleet roadmap and brief views show progress across repositories and the next actions that matter most. The brief also lists GitHub pull requests and GitLab merge requests awaiting your review.
- Review rules can capture recurring review feedback and check each diff. Review comments from a GitHub pull request can be imported as proposed rules.
- The `wrap` skill records a session's progress, decisions, and open threads for the next session.
- Status highlights documents that reached 100% but still need closeout, and no longer treats a draft request already in delivery as one to groom.

## Integrity and reliability

- Workflow operations follow declared links and write documents safely. Follow-up fixes close additional workflow integrity gaps.
- Audit renders from its first scan, reducing redundant work. It handles branch names and ignored folders correctly when checking paths.
- Subprocess text is decoded as UTF-8 on Windows. Review, fleet, lint, config, and release paths now surface errors that could previously be silent.
- The viewer and HTTP MCP mutations have stricter request checks. HTTP MCP access from a non-loopback address requires a bearer token; configure clients before exposing that listener.

## Dependencies and documentation

- Security-related dependency updates cover VS Code packaging, Mermaid/KaTeX, source-map-js, DOMPurify, brace-expansion, Vitest, and the MSAL override.
- The README is split into focused guides, and the full Logics workflow is illustrated in the documentation.
