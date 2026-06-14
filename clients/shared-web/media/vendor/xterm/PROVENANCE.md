# xterm.js vendored bundle

This directory carries the xterm.js terminal emulator and the two addons used by
the Workshop terminals sub-screen. The files are loaded by the viewer with
plain `<script>` and `<link rel="stylesheet">` tags — no bundler step is added.

## Files

| File                          | Source                                                                                | License |
| ----------------------------- | ------------------------------------------------------------------------------------- | ------- |
| `xterm.js`                    | https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js                                  | MIT     |
| `xterm.css`                   | https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css                                 | MIT     |
| `xterm-addon-fit.js`          | https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js              | MIT     |
| `xterm-addon-web-links.js`    | https://cdn.jsdelivr.net/npm/xterm-addon-web-links@0.9.0/lib/xterm-addon-web-links.js  | MIT     |

## Versions

- xterm.js: 5.3.0
- xterm-addon-fit: 0.8.0
- xterm-addon-web-links: 0.9.0

## Refresh

```
curl -sLfO https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js
curl -sLfO https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css
curl -sLfO https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js
curl -sLfO https://cdn.jsdelivr.net/npm/xterm-addon-web-links@0.9.0/lib/xterm-addon-web-links.js
```

Bump versions in this file and in `index.html`/`browser-host.js` together.
