import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ['development', 'browser', 'module', 'default'],
    alias: {
      'html-flip-book-base': path.resolve(__dirname, 'base/src/flipbook.ts')
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['base/src/**/*.test.ts', 'react/src/**/*.test.{ts,tsx}'],
    deps: {
      inline: ['react', 'react-dom', '@testing-library/react']
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['lcov', 'text', 'json-summary'],
      reportsDirectory: '.coverage/unit',
      include: ['base/src/**/*.ts', 'react/src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**']
    }
  }
})
