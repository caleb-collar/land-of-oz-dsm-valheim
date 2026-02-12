import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "node-demo"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/mod.ts"],
      thresholds: {
        // Baseline thresholds — increase as more tests are added
        // Coverage dropped after adding rcon module (low test coverage)
        // CLI/config/rcon-protocol modules have high coverage (80-100%)
        // Server/TUI/rcon-client modules need more tests
        statements: 16,
        branches: 19,
        functions: 16,
        lines: 16,
      },
    },
  },
});
