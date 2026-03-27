import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");
const distDir = path.join(root, "dist");
const vendorDir = path.join(distDir, "vendor");
const mermaidSourcePath = path.join(root, "node_modules", "mermaid", "dist", "mermaid.min.js");
const mermaidOutputPath = path.join(vendorDir, "mermaid.min.js");
const watchMode = process.argv.includes("--watch");

async function ensureVendorArtifacts() {
  await fs.promises.mkdir(vendorDir, { recursive: true });
  await fs.promises.copyFile(mermaidSourcePath, mermaidOutputPath);
}

const buildOptions = {
  entryPoints: [path.join(root, "src", "extension.ts")],
  outfile: path.join(distDir, "extension.js"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  external: ["vscode"],
  sourcemap: true,
  logLevel: "info",
  plugins: [
    {
      name: "copy-mermaid-vendor",
      setup(buildApi) {
        buildApi.onEnd(async () => {
          await ensureVendorArtifacts();
        });
      }
    }
  ]
};

await fs.promises.rm(distDir, { recursive: true, force: true });
await ensureVendorArtifacts();

if (watchMode) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  process.stdout.write("Watching extension bundle and vendor assets...\n");
  await new Promise(() => {});
} else {
  await build(buildOptions);
}
