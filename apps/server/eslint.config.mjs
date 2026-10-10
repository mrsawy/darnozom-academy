import path from 'path';
import { fileURLToPath } from 'url';
import baseConfig from '../../eslint.base.config.mjs';
import { commonConfig } from '../../eslint.shared.mjs';
import nodePlugin from 'eslint-plugin-n';
import redosPlugin from 'eslint-plugin-redos-detector';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default commonConfig([
  // Nest's default `test/` e2e stubs are not in tsconfig `include` (src only).
  {
    ignores: ['test/**'],
  },
  // Tsconfig path from this config file so CI and local cwd both resolve correctly
  {
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: path.join(__dirname, 'tsconfig.json'),
        },
      },
    },
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
  },
  nodePlugin.configs['flat/recommended'],
  {
    plugins: {
      'redos-detector': redosPlugin,
    },
    settings: {
      n: {
        // Set Node.js version to 20.0.0 to support array-prototype-tosorted
        version: '20.0.0',
      },
    },
    rules: {
      'redos-detector/no-unsafe-regex': 'error',
      '@typescript-eslint/no-base-to-string': 'off',
      'n/no-missing-import': 'off',
      'n/no-extraneous-import': 'off',
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
    },
  },
]);
