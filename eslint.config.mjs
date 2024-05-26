import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["**/dist/*"] },
  { languageOptions: { globals: globals.browser } },
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
];
