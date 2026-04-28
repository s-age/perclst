import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    cache: {
      dir: 'node_modules/.vitest'
    },
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
