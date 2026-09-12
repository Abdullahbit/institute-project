import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  noExternal: ["@workspace/db", "@institute/types"],
  external: ["pg", "drizzle-orm"],
});
