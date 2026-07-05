# Logics Manager 2.16.2

## VS Code packaging

- Builds viewer assets before packaging the VSIX so the installed extension serves the viewer UI instead of returning `{"error": "Not found"}`.
- Removes the unused legacy `package-vsix.py` path that could package without the viewer assets.
