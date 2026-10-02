import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["apps/*", "packages/*"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: [
        "apps/web/app/**/*.ts",
        "apps/web/src/**/*.ts",
        "packages/*/src/**/*.ts",
      ],
      exclude: ["**/*.test.ts", "packages/cli/src/test/**"],
    },
  },
});
