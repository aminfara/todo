// @ts-check

import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import globals from "globals";
import tseslint from "typescript-eslint";

const __dirname = new URL(".", import.meta.url).pathname;

export default tseslint.config(
  {
    ignores: [".git/", "build/", "coverage/", "dist/", "node_modules/", "tmp/"],
  },
  eslint.configs.recommended,
  {
    // This is the base config for all files
    languageOptions: {
      globals: {
        ...globals.nodeBuiltin,
      },
    },
    rules: {
      "n/no-extraneous-import": "off",
    },
  },
  {
    // This is the base config for all TypeScript files
    files: ["**/*.mts", "**/*.ts"],
    extends: [...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off", // This rule is handled by the TypeScript compiler
    },
  },
  // prettier recommended config should be the last one in the chain (it overrides all other
  // configs)
  eslintConfigPrettier,
);
