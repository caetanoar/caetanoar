import { defineConfig } from "vitest/config";
import path from "node:path";

const raiz = import.meta.dirname;

export default defineConfig({
  resolve: { alias: { "@": path.resolve(raiz, ".") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
