# Logics Manager 2.24.3

Fix the scheduled security audit by pinning minimatch to 11.0.4. Release date: 2026-11-02.

## Security audit fix

Delivered in PR #56 (commit `24795a479b2347e387b08562973c8cc17df2457c`): Fix the scheduled security audit with minimatch 11.0.4.

- Replace the minimatch 10-specific brace-expansion override with an exact minimatch 11.0.4 override and refresh the npm lockfile to address the globparts amplification denial-of-service advisory.
- Keep the existing audit policy, severity threshold, exceptions, and ESLint configuration unchanged.

## Maintenance

- Retry transient Marketplace publishing network failures up to three attempts, waiting 60 seconds between attempts; accept an existing publication only for the exact extension version and stop immediately on other errors.
- Align release version declarations, the README version badge, and lockfiles for 2.24.3, and regenerate the aggregate changelog.
