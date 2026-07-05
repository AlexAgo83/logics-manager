# Logics Manager 2.16.3

## VS Code viewer updates

- Includes the `VERSION` file in the VSIX package so bundled viewers report the installed extension version.
- Routes VS Code update messaging through the extension banner instead of suggesting CLI self-update from inside the panel.
- Shortens update-check caching to one hour and deduplicates installed-version resolution.
- Moves viewer panel controls into the Settings menu and rebuilds the browser-host bundle for the packaged viewer.
