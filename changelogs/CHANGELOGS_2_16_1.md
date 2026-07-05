# Logics Manager 2.16.1

## Automated Marketplace publishing

- Publishes the VSIX to the VS Code Marketplace automatically on every release tag.
- Requires a green CI run on the tagged commit before any publish (Marketplace, npm, PyPI) starts.
- Removes the manual dispatch bypass from the npm and PyPI publish workflows so releases can no longer skip CI.

## Fixes

- Fixes the viewer server test on Windows.
