import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");
const distDir = path.join(root, "dist");
const vendorDir = path.join(distDir, "vendor");
const mermaidSourcePath = path.join(root, "node_modules", "mermaid", "dist", "mermaid.min.js");
const mermaidOutputPath = path.join(vendorDir, "mermaid.min.js");

await fs.promises.rm(distDir, { recursive: true, force: true });
await fs.promises.mkdir(vendorDir, { recursive: true });

await build({
  entryPoints: [path.join(root, "src", "extension.ts")],
  outfile: path.join(distDir, "extension.js"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  external: ["vscode"],
  sourcemap: true,
  logLevel: "info"
});

await fs.promises.copyFile(mermaidSourcePath, mermaidOutputPath);
