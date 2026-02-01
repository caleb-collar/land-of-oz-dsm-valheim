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
        // Baseline thresholds - increase as more tests are added
        statements: 21,
        branches: 60,
        functions: 60,
        lines: 21,
      },
    },
  },
});
