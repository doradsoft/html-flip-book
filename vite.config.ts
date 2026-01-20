import { resolve } from 'node:path'
import { defineConfig, type LibraryFormats } from 'vite'

// Build configuration for different modules
// Use: npm run build:base, npm run build:react, etc.
export default defineConfig(() => {
  const target = process.env.BUILD_TARGET || 'base'

  const configs = {
    base: {
      build: {
        lib: {
          entry: resolve(__dirname, 'base/src/flipbook.ts'),
          formats: ['es'] as LibraryFormats[],
          fileName: 'flipbook',
        },
        outDir: 'base/dist',
        sourcemap: true,
        emptyOutDir: true,
        rollupOptions: {
          external: ['hammerjs', 'throttle-debounce'],
        },
      },
      plugins: [],
    },
    react: {
      build: {
        lib: {
          entry: resolve(__dirname, 'react/src/FlipBook.tsx'),
          formats: ['es'] as LibraryFormats[],
          fileName: 'flip-book',
        },
        outDir: 'react/dist',
        sourcemap: true,
        emptyOutDir: true,
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime', 'html-flip-book-base'],
        },
      },
      plugins: [],
      esbuild: {
        jsx: 'automatic',
      },
    },
    vanilla: {
      root: 'vanilla',
      build: {
        outDir: '../vanilla/dist',
        emptyOutDir: true,
      },
      plugins: [],
    },
  }

  const config = configs[target as keyof typeof configs] || configs.base

  return {
    ...config,
    css: {
      preprocessorOptions: {
        scss: {},
      },
    },
  }
})
