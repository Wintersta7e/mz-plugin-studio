// Every preset applies in full at error; lint-scope.json lists each place the config departs from them.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { includeIgnoreFile } from '@eslint/compat'
import { recommended as eslintCommentsRecommended } from '@eslint-community/eslint-plugin-eslint-comments/configs'
import eslintReact from '@eslint-react/eslint-plugin'
import js from '@eslint/js'
import vitest from '@vitest/eslint-plugin'
import prettierConfig from 'eslint-config-prettier/flat'
import { flatConfigs as importXConfigs } from 'eslint-plugin-import-x'
import jestDom from 'eslint-plugin-jest-dom'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import n from 'eslint-plugin-n'
import noUnsanitized from 'eslint-plugin-no-unsanitized'
import playwright from 'eslint-plugin-playwright'
import promise from 'eslint-plugin-promise'
import reactHooks from 'eslint-plugin-react-hooks'
import { configs as regexpConfigs } from 'eslint-plugin-regexp'
import { configs as sonarjsConfigs } from 'eslint-plugin-sonarjs'
import testingLibrary from 'eslint-plugin-testing-library'
import unicorn from 'eslint-plugin-unicorn'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import { configs as tseslintConfigs } from 'typescript-eslint'

const scope = JSON.parse(readFileSync(new URL('lint-scope.json', import.meta.url), 'utf8'))
const gitignore = fileURLToPath(new URL('.gitignore', import.meta.url))

// Preset ids of lint-scope.json, as each installed package exports them.
const PRESETS = {
  '@eslint/js recommended': js.configs.recommended,
  'typescript-eslint strictTypeChecked': tseslintConfigs.strictTypeChecked,
  'typescript-eslint stylisticTypeChecked': tseslintConfigs.stylisticTypeChecked,
  '@eslint-react/eslint-plugin strict-type-checked': eslintReact.configs['strict-type-checked'],
  'eslint-plugin-react-hooks recommended-latest': reactHooks.configs.flat['recommended-latest'],
  'eslint-plugin-jsx-a11y strict': jsxA11y.flatConfigs.strict,
  'eslint-plugin-no-unsanitized recommended': noUnsanitized.configs.recommended,
  'eslint-plugin-unicorn recommended': unicorn.configs.recommended,
  'eslint-plugin-sonarjs recommended': sonarjsConfigs.recommended,
  'eslint-plugin-regexp flat/recommended': regexpConfigs['flat/recommended'],
  'eslint-plugin-promise flat/recommended': promise.configs['flat/recommended'],
  'eslint-plugin-import-x flatConfigs.recommended': importXConfigs.recommended,
  'eslint-plugin-import-x flatConfigs.typescript': importXConfigs.typescript,
  'eslint-plugin-n flat/recommended-module': n.configs['flat/recommended-module'],
  '@eslint-community/eslint-plugin-eslint-comments recommended': eslintCommentsRecommended,
  '@vitest/eslint-plugin recommended': vitest.configs.recommended,
  'eslint-plugin-testing-library flat/react': testingLibrary.configs['flat/react'],
  'eslint-plugin-jest-dom flat/recommended': jestDom.configs['flat/recommended'],
  'eslint-plugin-playwright flat/recommended': playwright.configs['flat/recommended'],
  'typescript-eslint disableTypeChecked': tseslintConfigs.disableTypeChecked
}

const raise = (entry) => {
  if (entry === 'warn' || entry === 1) return 'error'
  if (Array.isArray(entry) && (entry[0] === 'warn' || entry[0] === 1))
    return ['error', ...entry.slice(1)]
  return entry
}
const raised = (block) =>
  block.rules === undefined
    ? block
    : {
        ...block,
        rules: Object.fromEntries(
          Object.entries(block.rules).map(([rule, entry]) => [rule, raise(entry)])
        )
      }
const scoped = ({ files, ignores }) => ({ files, ...(ignores !== undefined && { ignores }) })

const presetOf = (id) => {
  const preset = PRESETS[id]
  if (preset === undefined) throw new Error(`lint-scope.json: unknown preset ${id}`)
  return (Array.isArray(preset) ? preset : [preset]).map((block) => raised(block))
}

// The applied presets only, each scoped as lint-scope.json says and raised to error, in config order.
export const presetBlocks = defineConfig(
  scope.presets.map((entry) => ({ ...scoped(entry), extends: presetOf(entry.id) }))
)

// Rules eslint-config-prettier switches off: formatting is Prettier's.
export const prettierOffRules = Object.keys(prettierConfig.rules)

export default defineConfig(
  includeIgnoreFile(gitignore),
  globalIgnores(scope.dataGlobs),
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error'
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  { files: ['src/renderer/**'], languageOptions: { globals: globals.browser } },
  {
    files: [
      'src/main/**',
      'src/preload/**',
      'tools/**',
      'scripts/**',
      'e2e/**',
      '*.{ts,mts,cts,js,mjs,cjs}'
    ],
    languageOptions: { globals: globals.node }
  },
  ...presetBlocks,
  scope.optIns.map((entry) => ({ ...scoped(entry), rules: entry.rules })),
  scope.exclusions.map((entry) => ({
    ...scoped(entry),
    rules: { [entry.rule]: entry.options === undefined ? 'off' : ['error', ...entry.options] }
  })),
  scope.ownerSwaps.map((entry) => ({
    ...scoped(entry),
    rules: {
      [entry.rule]: 'off',
      ...(entry.replacement !== undefined && { [entry.replacement]: 'error' })
    }
  })),
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
  },
  {
    // Raw IPC skips the sender, argument and file-access checks; only the two wrappers use it.
    // Not caught: send or postMessage on a webContents or frame held under another name
    // (const wc = win.webContents), and a member reached by a computed name (electron['ipcMain']).
    files: ['src/**/*.{ts,tsx}'],
    ignores: scope.ipcExempt,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'electron',
              importNames: ['ipcMain', 'ipcRenderer', 'IpcMain'],
              message: 'Use the IPC wrappers: src/main/ipc/registration.ts or src/preload/ipc.ts.'
            }
          ]
        }
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name=/^ipc(Main|Renderer)$/]',
          message: 'Use the IPC wrappers.'
        },
        {
          selector:
            'CallExpression[callee.property.name=/^(send|sendToFrame|postMessage)$/][callee.object.property.name=/^(webContents|sender|mainFrame|senderFrame)$/]',
          message: 'Use emit() from the main IPC wrapper.'
        },
        {
          selector:
            'CallExpression[callee.property.name=/^(send|sendToFrame|postMessage)$/][callee.object.name=/^(webContents|sender|mainFrame|senderFrame)$/]',
          message: 'Use emit() from the main IPC wrapper.'
        },
        {
          selector: "CallExpression[callee.property.name='reply']",
          message: 'Use the IPC wrappers.'
        },
        {
          // A window's or frame's own IpcMain (webContents.ipc, WebFrameMain.ipc)
          selector: "MemberExpression[property.name='ipc']",
          message: 'Use the IPC wrappers.'
        },
        {
          // ipcMain reached through any electron module value: default, namespace, require, import()
          selector: 'MemberExpression[property.name=/^ipc(Main|Renderer)$/]',
          message: 'Use the IPC wrappers.'
        },
        {
          selector: 'ObjectPattern > Property[key.name=/^ipc(Main|Renderer)$/]',
          message: 'Use the IPC wrappers.'
        }
      ]
    }
  },
  prettierConfig
)
