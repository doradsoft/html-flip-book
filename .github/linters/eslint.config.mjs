import globals from "globals";
import eslint from '@eslint/js';
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import { fixupConfigRules } from "@eslint/compat";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintPluginJsonc from "eslint-plugin-jsonc";


export default tseslint.config(
  {
    plugins: {
      ['typescript-eslint']: tseslint,
      ['prettier']: eslintPluginPrettier,
      ['jsonc']: eslintPluginJsonc,
    },
  },
  {
    ignores: ["**/dist/*", "**/lib/*", "**/node_modules/*", "**/coverage/*"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  fixupConfigRules(pluginReactConfig),
  {
    languageOptions: {
      parser: tseslint.parser,
      globals: { ...globals.es2020, ...globals.browser, ...globals.node },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "prettier/prettier": "error",
      "jsonc/array-bracket-spacing": ["error", "never"],
      "jsonc/indent": ["error", 2],
      "jsonc/object-curly-spacing": ["error", "always"],
    },
    extends: [
      "eslint:recommended",
      "plugin:typescript-eslint/recommended",
      "plugin:jsonc/recommended-with-jsonc",
      "plugin:prettier/recommended"
    ],
  },
);
