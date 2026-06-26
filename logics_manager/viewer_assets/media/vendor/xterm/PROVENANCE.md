# xterm.js vendored bundle

This directory carries the xterm.js terminal emulator and the two addons used by
the Workshop terminals sub-screen. The files are loaded by the viewer with
plain `<script>` and `<link rel="stylesheet">` tags — no bundler step is added.

## Files

| File                          | Source                                                                                | License |
| ----------------------------- | ------------------------------------------------------------------------------------- | ------- |
| `xterm.js`                    | https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.js                           | MIT     |
| `xterm.css`                   | https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css                          | MIT     |
| `xterm-addon-fit.js`          | https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.js                  | MIT     |
| `xterm-addon-web-links.js`    | https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0.11.0/lib/addon-web-links.js      | MIT     |

## Versions

- @xterm/xterm: 5.5.0
- @xterm/addon-fit: 0.10.0
- @xterm/addon-web-links: 0.11.0

## Refresh

```
curl -sLf https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.js -o xterm.js
curl -sLf https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css -o xterm.css
curl -sLf https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.js -o xterm-addon-fit.js
curl -sLf https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0.11.0/lib/addon-web-links.js -o xterm-addon-web-links.js
```

Bump versions in this file and in `index.html`/`browser-host.js` together.
