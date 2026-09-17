import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts', 'src/test/**'],
      thresholds: {
        statements: 99,
        branches: 95,
        functions: 100,
        lines: 100,
      },
    },
  },
})
