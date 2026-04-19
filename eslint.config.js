// @ts-check
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier/recommended'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  {
    rules: {
      // Enforce type over interface (avoid declaration merging)
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],

      // Max file length: 300 lines
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],

      // Max function length: 50 lines
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    // TSX: JSX makes render functions longer, raise the limit
    files: ['**/*.tsx'],
    rules: {
      'max-lines-per-function': ['warn', { max: 75, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    // Test files: suites naturally grow long, so relax function-length limit
    files: ['**/__tests__/**', '**/*.test.ts'],
    rules: {
      'max-lines-per-function': 'off'
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**']
  }
)
