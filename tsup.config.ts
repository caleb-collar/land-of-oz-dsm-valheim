import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["main.ts"],
  format: ["esm"],
  target: "node22",
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
  // Only bundle our own code, keep dependencies external
  noExternal: [],
  banner: {
    js: "#!/usr/bin/env node",
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
