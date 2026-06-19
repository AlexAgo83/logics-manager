const coverageTarget = process.env.CDX_PLUGIN_COVERAGE_TARGET ?? "combined";
const coverageInclude =
  coverageTarget === "src"
    ? ["clients/vscode/src/**/*.ts"]
    : coverageTarget === "media"
      ? ["clients/shared-web/media/**/*.js"]
      : ["clients/vscode/src/**/*.ts", "clients/shared-web/media/**/*.js"];
const coverageReportsDirectory =
  coverageTarget === "src"
    ? "coverage/plugin-src"
    : coverageTarget === "media"
      ? "coverage/plugin-media"
      : "coverage/plugin";
const coverageThresholds =
  coverageTarget === "src"
    ? {
      lines: 72,
      statements: 72,
      functions: 78,
      branches: 63
      }
    : coverageTarget === "media"
      ? {
        lines: 78,
        statements: 78,
        functions: 78,
        branches: 64
      }
    : undefined;

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      all: true,
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: coverageReportsDirectory,
      include: coverageInclude,
      thresholds: coverageThresholds,
      exclude: ["**/*.d.ts", "dist/**", "tests/**", "clients/shared-web/media/vendor/**"]
    }
  }
});
