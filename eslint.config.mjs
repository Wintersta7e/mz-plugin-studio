import tsConfigPkg from '@electron-toolkit/eslint-config-ts'
import prettierConfig from '@electron-toolkit/eslint-config-prettier'
import reactPlugin from 'eslint-plugin-react'

const { configs, config } = tsConfigPkg

export default config(
  { ignores: ['node_modules', 'dist', 'out', 'tools'] },
  ...configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  prettierConfig,
  {
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['tests/**/*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
)
