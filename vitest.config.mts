const coverageTarget = process.env.CDX_PLUGIN_COVERAGE_TARGET ?? "combined";
const coverageInclude =
  coverageTarget === "src"
    ? ["src/**/*.ts"]
    : coverageTarget === "media"
      ? ["media/**/*.js"]
      : ["src/**/*.ts", "media/**/*.js"];
const coverageReportsDirectory =
  coverageTarget === "src"
    ? "coverage/plugin-src"
    : coverageTarget === "media"
      ? "coverage/plugin-media"
      : "coverage/plugin";
const coverageThresholds =
  coverageTarget === "src"
    ? {
      lines: 68,
      statements: 68,
      functions: 73,
      branches: 61
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
      exclude: ["**/*.d.ts", "dist/**", "tests/**"]
    }
  }
});
