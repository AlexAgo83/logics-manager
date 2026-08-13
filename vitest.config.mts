const coverageTarget = process.env.CDX_PLUGIN_COVERAGE_TARGET ?? "combined";
// `clients/viewer/src/browser-host/**` is deliberately absent from every target.
// Its tests (tests/viewer.browser-host.test.ts, ~7.4k lines) load the *built*
// bundle `clients/viewer/browser-host.js` into JSDOM, so instrumenting the
// sources attributes nothing back to them and reports under 2% for code that is
// substantially tested. Including it would produce a false signal, not a
// missing one. Measuring it properly means having the tests load the sources
// instead -- a test-harness change for a number, not for safety.
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
const testExclude = process.env.CDX_PLUGIN_COVERAGE_TARGET ? ["tests/viewer.campaign-report.test.ts"] : [];
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
        statements: 77,
        functions: 78,
        branches: 64
      }
    : undefined;

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: testExclude,
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
