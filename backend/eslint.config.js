// @ts-check

import eslint from "@eslint/js";
import nodePlugin from "eslint-plugin-n";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".git/", "build/", "coverage/", "dist/", "node_modules/"],
  },
  eslint.configs.recommended,
  nodePlugin.configs["flat/recommended-module"],
  eslintPluginUnicorn.configs.recommended,
  {
    // This is the base config for all files
    languageOptions: {
      globals: {
        ...globals.nodeBuiltin,
      },
    },
    rules: {},
  },
  {
    // This is the base config for all TypeScript files
    files: ["**/*.mts", "**/*.ts"],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {},
  },
  {
    // This is the base config for all tests
    files: ["**/*.test.*", "**/*.spec.*"],
    rules: {},
  },
  // prettier recommended config should be the last one in the chain (it overrides all other
  // configs)
  eslintPluginPrettierRecommended,
);
