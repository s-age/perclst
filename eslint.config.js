// @ts-check
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier/recommended'

import reactHooksPlugin from 'eslint-plugin-react-hooks'

import maxParamsRule from './eslint-rules/max-params.js'
import noAnyRule from './eslint-rules/no-any.js'

const localPlugin = {
  rules: {
    'max-params': maxParamsRule,
    'no-any': noAnyRule
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
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooksPlugin },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'max-lines-per-function': ['warn', { max: 75, skipBlankLines: true, skipComments: true }]
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
    ignores: ['dist/**', 'node_modules/**', 'eslint-rules/**']
  }
)
