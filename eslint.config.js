// @ts-check
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier/recommended'

import reactHooksPlugin from 'eslint-plugin-react-hooks'

import importPlugin from 'eslint-plugin-import-x'
import maxParamsRule from './eslint-rules/max-params.js'
import noAnyRule from './eslint-rules/no-any.js'
import repositoryFsVsShellRule from './eslint-rules/repository-fs-vs-shell.js'
import importViaPortRule from './eslint-rules/import-via-port.js'

const localPlugin = {
  rules: {
    'max-params': maxParamsRule,
    'no-any': noAnyRule,
    'repository-fs-vs-shell': repositoryFsVsShellRule,
    'import-via-port': importViaPortRule
  }
}

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  {
    plugins: { local: localPlugin },
    rules: {
      // Enforce type over interface (avoid declaration merging)
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],

      // Prefer `import type` for type-only imports
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

      // Require explicit return types on functions
      '@typescript-eslint/explicit-function-return-type': 'error',

      // Ban `any` with actionable guidance; use eslint-disable with a comment for exceptions
      '@typescript-eslint/no-explicit-any': 'off',
      'local/no-any': 'error',

      // Max 4 parameters with actionable guidance
      'max-params': 'off',
      'local/max-params': ['error', { max: 4 }],

      // Max file length: 300 lines
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],

      // Max function length: 50 lines
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],

      // Ban snake_case local variables (properties intentionally stay unconstrained)
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          filter: { regex: '^__', match: false }
        }
      ]
    }
  },
  {
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooksPlugin },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'max-lines-per-function': ['error', { max: 75, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    // Validator rule functions rely on Zod's type inference — explicit return types break it
    files: ['src/validators/rules/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off'
    }
  },
  {
    // Test files: suites naturally grow long, raise limits
    files: ['**/__tests__/**', '**/*.test.ts'],
    rules: {
      'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': 'off',
      'local/max-params': 'off'
    }
  },
  {
    // hooks/ scripts are plain ESM Node scripts — apply Node globals and relax TS-specific rules
    files: ['hooks/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        URL: 'readonly',
      }
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    }
  },
  {
    plugins: { import: importPlugin },
    rules: {
      'import/no-cycle': ['error', { maxDepth: 10, ignoreExternal: true }]
    }
  },
  {
    files: ['src/repositories/**/*.ts'],
    rules: {
      'local/repository-fs-vs-shell': 'warn'
    }
  },
  {
    files: ['src/domains/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'fs', message: 'Domains must not perform I/O. Add a repository method instead.' },
          { name: 'path', message: 'Domains must not import path directly. Use @src/utils/path instead.' }
        ]
      }]
    }
  },
  {
    files: ['src/utils/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'fs', message: 'Utils layer: I/O modules are forbidden. Move I/O logic to src/infrastructures/ or src/cli/.' },
          { name: 'readline', message: 'Utils layer: I/O modules are forbidden. Move CLI prompts to src/cli/.' },
          { name: 'net', message: 'Utils layer: I/O modules are forbidden.' },
          { name: 'child_process', message: 'Utils layer: I/O modules are forbidden.' }
        ]
      }]
    }
  },
  {
    files: ['src/services/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'fs', message: 'Service layer must not call fs operations directly. Add a repository method instead.' },
          { name: 'path', message: 'Service layer must not import path directly. Use @src/utils/path instead.' }
        ]
      }]
    }
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'local/import-via-port': 'error'
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'eslint-rules/**']
  }
)
