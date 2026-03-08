// @ts-check

import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import eslintPluginN from "eslint-plugin-n";
import eslintPluginSecurity from "eslint-plugin-security";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const __dirname = new URL(".", import.meta.url).pathname;

export default defineConfig(
  {
    ignores: [".git/", "build/", "coverage/", "dist/", "node_modules/", "tmp/"],
  },
  eslint.configs.recommended,
  eslintPluginN.configs["flat/recommended-module"],
  eslintPluginUnicorn.configs.recommended,
  // @ts-ignore: This plugin doesn't have types, but it works fine
  eslintPluginSecurity.configs.recommended,
  {
    // This is the base config for all files
    languageOptions: {
      globals: {
        ...globals.nodeBuiltin,
      },
    },
    rules: {
      "n/no-extraneous-import": "off",
      "unicorn/prevent-abbreviations": "off",
      "n/no-unpublished-import": "off",
      "no-unused-vars": [
        "warn", // Or 'error' depending on your preference
        {
          argsIgnorePattern: "^_", // Ignore arguments starting with an underscore
          varsIgnorePattern: "^_", // Ignore variables starting with an underscore
          caughtErrorsIgnorePattern: "^_", // Ignore caught errors starting with an underscore
        },
      ],
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
