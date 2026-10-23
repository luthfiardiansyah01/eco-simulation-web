import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const src = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': src,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.tsx'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/app/**/loading.tsx',
        'src/app/**/error.tsx',
        'src/app/global-error.tsx',
        'src/app/layout.tsx',
        'src/app/globals.css',
      ],
    },
  },
})
