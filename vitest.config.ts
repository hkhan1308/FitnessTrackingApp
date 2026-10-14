import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["lib/**/*.test.ts", "node_modules/**"],
  },
});
