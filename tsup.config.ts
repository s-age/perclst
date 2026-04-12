import { defineConfig } from 'tsup'
import { resolve } from 'path'

export default defineConfig({
  entry: {
    'src/cli/index': 'src/cli/index.ts',
    'src/mcp/server': 'src/mcp/server.ts',
  },
  format: ['esm'],
  outDir: 'dist',
  target: 'node18',
  splitting: false,
  sourcemap: true,
  dts: true,
  clean: true,
  esbuildOptions(options) {
    options.alias = {
      '@src': resolve('./src'),
      '@types': resolve('./types'),
    }
  },
})
