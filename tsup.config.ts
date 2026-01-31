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
  // Bundle all dependencies for standalone distribution
  noExternal: [/.*/],
  banner: {
    js: "#!/usr/bin/env node",
  },
  esbuildOptions(options) {
    // Mark optional dev dependencies as external
    options.external = ["react-devtools-core"];
  },
});
