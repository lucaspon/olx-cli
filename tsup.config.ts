import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  outDir: 'dist',
  format: ['cjs'],
  platform: 'node',
  target: 'node18',
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  shims: false,
})
