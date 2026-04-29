import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: 'node_modules/.vite',
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/domains/ports/**',
        'src/repositories/ports/**',
        'src/types/**'
      ]
    }
  }
})
