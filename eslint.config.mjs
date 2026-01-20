import globals from 'globals'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js'
import { fixupConfigRules } from '@eslint/compat'
import eslintPluginPrettier from 'eslint-plugin-prettier'

export default tseslint.config(
  {
    plugins: {
      ['prettier']: eslintPluginPrettier
    }
  },
  {
    ignores: [
      '**/dist/*',
      '**/lib/*',
      '**/node_modules/*',
      '**/coverage/*',
      '**/.coverage/*',
      '**/.playwright-report/*',
      '**/monocart-report/*',
      'react/example/vite.config.js',
      'react/example/vite-env.d.ts',
      'eslint.config.mjs'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...fixupConfigRules(pluginReactConfig),
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname
      },
      globals: { ...globals.es2020, ...globals.browser, ...globals.node }
    },
    rules: {
      'prettier/prettier': 'error',
      'react/react-in-jsx-scope': 'off',
      // Turn off problematic rules that conflict with practical usage
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ]
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  // Relaxed rules for test files
  {
    files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
)
