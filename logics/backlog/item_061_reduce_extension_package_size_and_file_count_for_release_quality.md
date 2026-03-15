## item_061_reduce_extension_package_size_and_file_count_for_release_quality - Reduce extension package size and file count for release quality
> From version: 1.10.0
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Progress: 100%
> Complexity: Medium
> Theme: Extension packaging hygiene and runtime performance
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The extension currently packages successfully, but `vsce` warns that too many JavaScript files are being shipped and recommends bundling and/or a stricter `.vscodeignore`.

That makes the release artifact noisier and heavier than it should be, even if the extension still works correctly.

# Scope
- In:
  - Audit the runtime package contents.
  - Remove unnecessary packaged files through `.vscodeignore` or equivalent packaging cleanup.
  - Introduce bundling only if it provides a clear release-quality improvement.
  - Preserve current runtime behavior and validation flows.
- Out:
  - Broad build-system churn without clear packaging value.
  - Changing plugin features.
  - Unrelated runtime optimizations.

# Acceptance criteria
- AC1: The VSIX includes fewer unnecessary files than the current baseline.
- AC2: Packaging hygiene is improved through bundling, `.vscodeignore`, or a justified combination.
- AC3: Required runtime files remain present.
- AC4: `package:ci` still succeeds after the cleanup.
- AC5: The packaging decision is documented clearly enough to avoid regressions.

# Priority
- Impact:
  - Medium: this improves release quality and package footprint.
- Urgency:
  - Medium: worth addressing before another release cycle adds more packaging noise.

# Notes
- Derived from `logics/request/req_052_reduce_extension_package_size_and_file_count_for_release_quality.md`.
- Start with the cheapest high-signal cleanup: confirm what the runtime actually needs, then tighten packaging before considering a heavier bundling step.

# Tasks
- `logics/tasks/task_066_reduce_extension_package_size_and_file_count_for_release_quality.md`
