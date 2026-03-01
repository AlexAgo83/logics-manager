import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const port = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function resolvePath(urlPath) {
  const clean = urlPath.split("?")[0].split("#")[0];
  const requested = clean === "/" ? "/debug/webview/index.html" : clean;
  const absolute = path.resolve(repoRoot, `.${requested}`);
  if (!absolute.startsWith(repoRoot)) {
    return null;
  }
  return absolute;
}

createServer((req, res) => {
  const absolute = resolvePath(req.url || "/");
  if (!absolute || !existsSync(absolute) || !statSync(absolute).isFile()) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  const extension = path.extname(absolute).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";
  res.setHeader("Content-Type", contentType);
  res.end(readFileSync(absolute));
}).listen(port, () => {
  console.log(`Webview debug harness running at http://localhost:${port}`);
});

