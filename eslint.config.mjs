import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import { fixupConfigRules } from "@eslint/compat";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintPluginJsonc from "eslint-plugin-jsonc";

export default [
  {
    ignores: ["**/dist/*", "**/lib/*", "**/node_modules/*", "**/coverage/*"]
  },
  {
    languageOptions: {
      parser: "@typescript-eslint/parser",
      globals: globals.browser
    }
  },
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  fixupConfigRules(pluginReactConfig),
  {
    plugins: {
      "@typescript-eslint": tseslint,
      "prettier": eslintPluginPrettier,
      "jsonc": eslintPluginJsonc
    },
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:jsonc/recommended-with-jsonc",
      "plugin:prettier/recommended"
    ],
    rules: {
      "prettier/prettier": "error",
      "jsonc/array-bracket-spacing": ["error", "never"],
      "jsonc/indent": ["error", 2],
      "jsonc/object-curly-spacing": ["error", "always"],
      "@typescript-eslint/no-unused-vars": ["error"]
    }
  }
];
