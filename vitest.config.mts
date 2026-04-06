import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      all: true,
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage/plugin",
      include: ["src/**/*.ts", "media/**/*.js"],
      exclude: ["**/*.d.ts", "dist/**", "tests/**"]
    }
  }
});
