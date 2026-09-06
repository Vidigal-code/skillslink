import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import yak from "eslint-plugin-yak";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    "**/dist/**",
    "**/out/**",
    "**/.next/**",
    "**/coverage/**",
    "apps/web/public/raw/**",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    ...yak.configs.recommended,
    rules: {
      ...yak.configs.recommended.rules,
      "eslint-plugin-yak/css-global-deprecated": "error",
    },
  },
  {
    settings: {
      next: {
        rootDir: "apps/web/",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
