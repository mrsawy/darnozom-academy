import baseConfig from '../../eslint.base.config.mjs';
import { commonConfig } from '../../eslint.shared.mjs';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import testingLibraryPlugin from 'eslint-plugin-testing-library';
import jestDomPlugin from 'eslint-plugin-jest-dom';
import nextPlugin from '@next/eslint-plugin-next';
import reactCompilerPlugin from 'eslint-plugin-react-compiler';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import pluginQuery from '@tanstack/eslint-plugin-query';
import eslintPluginI18next from 'eslint-plugin-i18next';
import i18nextNoLiteralDefaults from 'eslint-plugin-i18next/lib/options/defaults.js';

export default [
  ...baseConfig,
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'build/**', '*.config.mjs', '.prettierrc.mjs', 'next-env.d.ts'],
  },
  ...commonConfig([
    reactPlugin.configs.flat.recommended,
    reactPlugin.configs.flat['jsx-runtime'],
    ...pluginQuery.configs['flat/recommended'],
    {
      ...jsxA11y.flatConfigs.recommended,
      files: ['src/**/*.tsx'],
      settings: {
        ...jsxA11y.flatConfigs.recommended.settings,
        'jsx-a11y': {
          components: {
            Label: 'label',
            H1: 'h1',
            H2: 'h2',
            H4: 'h4',
            H5: 'h5',
            H6: 'h6',
            Body: 'span',
            Button: 'button',
            Input: 'input',
          },
        },
      },
    },
    {
      plugins: {
        'react-hooks': reactHooksPlugin,
        'react-compiler': reactCompilerPlugin,
      },
      rules: {
        ...reactHooksPlugin.configs.recommended.rules,
        'react-compiler/react-compiler': 'error',
      },
    },
    testingLibraryPlugin.configs['flat/react'],
    jestDomPlugin.configs['flat/recommended'],
    {
      plugins: {
        '@next/next': nextPlugin,
      },
      rules: {
        ...nextPlugin.configs.recommended.rules,
        ...nextPlugin.configs['core-web-vitals'].rules,
      },
    },
    {
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        'require-await': 'off',
        '@typescript-eslint/require-await': 'off',
        'react/display-name': 'off',
        'react/jsx-boolean-value': 'error',
        'react/function-component-definition': [
          'error',
          {
            namedComponents: 'function-declaration',
            unnamedComponents: 'arrow-function',
          },
        ],
        'react/jsx-fragments': 'error',
        'react/jsx-no-useless-fragment': 'error',
        'react/no-unused-prop-types': 'error',
        'react/self-closing-comp': 'error',
        'react/void-dom-elements-no-children': 'error',
        'react/jsx-pascal-case': [
          'error',
          {
            allowNamespace: true,
          },
        ],
      },
    },
    {
      files: ['src/**/*.tsx', 'src/**/*.ts'],
      rules: {
        'react/button-has-type': 'error',
        'react/iframe-missing-sandbox': 'error',
        'react/jsx-no-leaked-render': 'error',
        'react/no-object-type-as-default-prop': 'error',
      },
    },
    {
      files: ['**/*.test.js', '**/*.test.jsx', '**/*.test.ts', '**/*.test.tsx'],
      rules: {
        '@typescript-eslint/unbound-method': 'off',
        'tailwindcss/no-custom-classname': 'off',
      },
    },
  ]),
  // Puck sections expose `render: (props) => ...`; Testing Library treats `render` like RTL's render().
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'testing-library/render-result-naming-convention': 'off',
    },
  },
  // Assistant UI–style modules use arrow components; enforcing function declarations adds churn without safety gains here.
  {
    files: [
      'src/components/assistant-ui/**/*.tsx',
      'src/components/attachment.tsx',
      'src/components/markdown-text.tsx',
      'src/components/thread.tsx',
      'src/components/tool-fallback.tsx',
      'src/components/assistant-modal.tsx',
      'src/components/molecules/ai/**/*.tsx',
      'src/components/atoms/ai/**/*.tsx',
    ],
    rules: {
      'react/function-component-definition': 'off',
      'react/prop-types': 'off',
    },
  },
  // User-visible copy must go through next-intl. Mirrors the rule in apps/lms-mobile.
  // `warn` (not `error`) so the shadcn primitives under src/components/atoms — whose
  // remaining `sr-only` labels are a separate, deferred migration — keep CI green.
  {
    files: ['src/**/*.tsx'],
    plugins: {
      i18next: eslintPluginI18next,
    },
    rules: {
      'i18next/no-literal-string': [
        'warn',
        {
          framework: 'react',
          mode: 'jsx-only',
          message: "User-visible copy should use i18n (e.g. useTranslations()('…'))",
          'jsx-attributes': {
            include: [...(i18nextNoLiteralDefaults['jsx-attributes'].include ?? [])],
            exclude: [
              ...(i18nextNoLiteralDefaults['jsx-attributes'].exclude ?? []),
              // Identifiers & routing (not end-user copy)
              'testID',
              'testId',
              'data-testid',
              'id',
              'name',
              'href',
              'to',
              'pathname',
              'key',
              'htmlFor',
              'src',
              // Radix / shadcn / design-system enum props
              'role',
              'type',
              'variant',
              'size',
              'side',
              'align',
              'position',
              'mode',
              'orientation',
              'direction',
              'dir',
              'as',
              'effect',
              'iconPlacement',
              'anchor',
              'collisionPadding',
              'sticky',
              'avoidCollisions',
              'modal',
              'sideOffset',
              // Form control values (option/tab tokens, not copy)
              'value',
              'defaultValue',
              // Native/HTML attributes carrying enum tokens
              'lang',
              'color',
              'fill',
              'stroke',
              'autoComplete',
              'inputMode',
              'accept',
              'method',
              'target',
              'rel',
              'loading',
              'decoding',
              'referrerPolicy',
              'sandbox',
              'allow',
              'layout',
              'objectFit',
              // SVG path/geometry attributes
              'strokeLinecap',
              'strokeLinejoin',
              'viewBox',
              'xmlns',
              'd',
              'points',
              // a11y wiring (element ids, not copy)
              'aria-labelledby',
              'aria-describedby',
              'aria-errormessage',
              'aria-controls',
              // Intl / date formatting tokens
              'format',
              'locale',
              'timeZone',
              'currency',
              'weekStartsOn',
              'captionLayout',
              'buttonVariant',
              'navLayout',
              // Chart & table field bindings (data keys, not copy)
              'labelKey',
              'valueKey',
              'colorKey',
              'dataKey',
              'nameKey',
              'xKey',
              'yKey',
              'accessor',
              // Message-key props: the child component translates these itself
              'emptyKey',
              'paginationKey',
              'titleKey',
              'descriptionKey',
              // assistant-ui primitives (behavior tokens, not copy)
              'turnAnchor',
              'autohide',
              'data-role',
              'data-slot',
              'data-state',
              // recharts series grouping token
              'stackId',
              // className pass-through props on custom wrappers (Tailwind tokens, not copy)
              'buttonClassName',
              'contentClassName',
              'triggerClassName',
              'wrapperClassName',
              'containerClassName',
              'itemClassName',
              'labelClassName',
              'inputClassName',
              'iframeClassName',
              // chart axis field bindings + responsive image sizes descriptor
              'xField',
              'yField',
              'sizes',
              'countClassName',
              'iconClassName',
              'seriesField',
              // FullCalendar view/behaviour tokens
              'initialView',
              'eventDisplay',
              // next-themes
              'defaultTheme',
            ],
          },
          words: {
            ...i18nextNoLiteralDefaults.words,
            exclude: [
              ...(i18nextNoLiteralDefaults.words.exclude ?? []),
              // Hex colors and absolute URLs (design & assets)
              '#[0-9A-Fa-f]{3,8}',
              'https?:\\/\\/.+',
              // MIME types (protocol tokens, not copy)
              '(application|image|video|audio|text)\\/[-+.\\w]+',
              // Decorative glyphs (kebab/close/check/star markers, not translatable words)
              '[⋮✕×▼▾✓✦★⭐☰→←·–—]+',
              // CSS custom properties / design tokens
              'var\\(--.+\\)',
              // Link/window targets and mailto/tel URIs
              '_(blank|self|parent|top)',
              '(mailto|tel):.+',
              // CSS lengths / angles
              '[-\d.]+(px|rem|em|%|vh|vw|deg|fr|ch)',
              // Single-letter React keys (skeleton placeholders)
              '[a-z]',
              // Bracketed internal diagnostics, never shown as product copy
              '\[.+\]',
              // Keyboard shortcut hints
              '[⇧⌘⌥⌃↵⏎]\+?.*',
            ],
          },
          callees: {
            include: [...(i18nextNoLiteralDefaults.callees.include ?? [])],
            exclude: [
              ...(i18nextNoLiteralDefaults.callees.exclude ?? []),
              '^(cn|clsx|classNames|twMerge|tailwindMerge|cva)$',
              'console\\..+',
              // react-hook-form field-path APIs (arguments are field names)
              '^(register|setValue|watch|getValues|resetField|unregister|clearErrors|setError|setFocus|trigger|getFieldState)$',
              // date-fns / Intl formatting tokens
              '^(format|formatDate|parse|parseISO|formatInTimeZone)$',
              'toLocaleString',
              'toLocaleDateString',
              'toLocaleTimeString',
              // next-intl itself: the argument IS the message key
              '^(t|tCommon|tc|tr|translate)$',
              '.+\\.t$',
              // Routing / storage / cache keys
              '^(push|replace|prefetch|revalidateTag|revalidatePath|getItem|setItem|removeItem)$',
              // URL search-param writers (arguments are param names)
              '^(updateParam|setParam|set|get|append|delete)$',
              // window.open(url, target)
              'window\.open',
            ],
          },
          'object-properties': {
            include: [...(i18nextNoLiteralDefaults['object-properties'].include ?? [])],
            exclude: [
              ...(i18nextNoLiteralDefaults['object-properties'].exclude ?? []),
              // Inline-style and media-constraint object keys (CSS/DOM values, not copy)
              '^top$',
              '^bottom$',
              '^left$',
              '^right$',
              '^fontSize$',
              '^translateY$',
              '^translateX$',
              '^facingMode$',
            ],
          },
          'class-properties': { ...i18nextNoLiteralDefaults['class-properties'] },
          'should-validate-template': i18nextNoLiteralDefaults['should-validate-template'],
        },
      ],
    },
  },
  // Must come last: overrides shared rules for tooling entrypoints.
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'unicorn/import-style': 'off',
      'no-console': 'off',
      'unicorn/no-process-exit': 'off',
    },
  },
];
