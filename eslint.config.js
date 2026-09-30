import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/coverage/**", "packages/*/dist/**", "dist/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: [
          "./packages/evidence-core/tsconfig.test.json",
          "./packages/evidence-cli/tsconfig.test.json",
          "./tsconfig.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: {
        AbortSignal: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        structuredClone: "readonly",
      },
      parserOptions: {
        program: null,
        project: false,
        projectService: false,
      },
    },
  },
  {
    files: [".github/scripts/**/*.mjs"],
    rules: {
      "no-control-regex": "off",
    },
  },
);
