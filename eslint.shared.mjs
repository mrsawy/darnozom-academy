import path from 'node:path';
import { fileURLToPath } from 'node:url';
import eslint from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import stylistic from '@stylistic/eslint-plugin';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
/**
 *
 * @param {import('typescript-eslint').ConfigWithExtends[]} nextConfigs
 * @returns
 */
export function commonConfig(nextConfigs = []) {
  return tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...tseslint.configs.stylistic,
    importPlugin.flatConfigs.recommended,
    importPlugin.flatConfigs.typescript,
    {
      plugins: {
        vitest,
      },
      rules: {
        ...vitest.configs.recommended.rules,
        'vitest/expect-expect': 'warn',
      },
      languageOptions: {
        globals: {
          ...vitest.environments.env.globals,
        },
      },
      settings: {
        vitest: {
          typecheck: true,
        },
      },
    },
    eslintPluginUnicorn.configs['flat/recommended'],
    {
      settings: {
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            project: [
              path.join(repoRoot, 'apps/client/tsconfig.json'),
              path.join(repoRoot, 'apps/server/tsconfig.json'),
              path.join(repoRoot, 'apps/lms-mobile/tsconfig.json'),
            ],
          },
        },
      },
      languageOptions: {
        parserOptions: {
          project: true,
          tsconfigRootDir: repoRoot,
        },
      },
      rules: {
        'unicorn/prevent-abbreviations': 'off',
        'unicorn/no-null': 'off',
        'unicorn/filename-case': 'off',
        'unicorn/no-await-expression-member': 'off',
        'unicorn/prefer-top-level-await': 'off',
        'unicorn/catch-error-name': 'off',
        'unicorn/no-array-for-each': 'off',
        'unicorn/no-array-callback-reference': 'off',
        '@typescript-eslint/no-deprecated': 'error',
        // Allow unused variables that start with underscore
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
            ignoreRestSiblings: true,
          },
        ],
        // Allow both relative and absolute paths (disable rules that enforce one or the other)
        'import/no-relative-packages': 'off',
        'import/no-relative-parent-imports': 'off',
        'import/no-absolute-path': 'off',
        // Disallow console.log
        'no-console': 'error',
      },
    },
    stylistic.configs.recommended,
    ...nextConfigs,
    eslintPluginPrettierRecommended,
    {
      linterOptions: {
        reportUnusedDisableDirectives: 'error',
      },
      rules: {
        quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: false }],
      },
    }
  );
}
