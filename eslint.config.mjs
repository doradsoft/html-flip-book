import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import { fixupConfigRules } from "@eslint/compat";


export default [
  { ignores: ["**/dist/*"] },
  { languageOptions: { globals: globals.browser } },
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  ...fixupConfigRules(pluginReactConfig)
];
