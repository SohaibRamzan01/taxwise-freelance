import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8", include: ["src/lib/**/*.ts"], exclude: ["src/lib/db.ts", "src/lib/**/*.test.ts"],
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
});
