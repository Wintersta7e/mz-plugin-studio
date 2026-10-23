import tsConfigPkg from '@electron-toolkit/eslint-config-ts'
import prettierConfig from '@electron-toolkit/eslint-config-prettier'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

const { configs, config } = tsConfigPkg

export default config(
  {
    ignores: [
      'node_modules',
      'dist',
      'out',
      'tools',
      'tests/fixtures/**',
      'tests/golden/__golden__/**'
    ]
  },
  ...configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  prettierConfig,
  {
    plugins: {
      'react-hooks': reactHooksPlugin
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports'
        }
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // A window.confirm dialog cannot make Cancel its Enter button; dialog.message does
      'no-alert': 'error'
    }
  },
  {
    files: ['src/preload/**/*'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off'
    }
  },
  {
    files: ['tests/**/*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off'
    }
  },
  {
    // Mirrors the routed list owned by tests/unit/test-layout.test.ts
    files: ['tests/**/*.{ts,tsx}'],
    ignores: ['tests/dom/**', 'tests/golden/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/renderer/src/stores',
                '**/renderer/src/stores/**',
                '@/stores',
                '@/stores/**',
                '**/renderer/src/components',
                '**/renderer/src/components/**',
                '@/components',
                '@/components/**',
                '**/renderer/src/App',
                '@/App',
                '@testing-library/react',
                '@testing-library/user-event'
              ],
              message:
                'Tests importing a store, component, App or Testing Library belong in tests/dom/.'
            }
          ]
        }
      ]
    }
  }
)
