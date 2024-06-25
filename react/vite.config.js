import reactRefresh from '@vitejs/plugin-react-refresh'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import dts from 'vite-plugin-dts'
import fs from 'fs'
import path from 'path'

export default defineConfig(({ mode }) => {
  return {
    mode,
    base: '',
    build: {
      sourcemap: true,
      emptyOutDir: true,
      lib: {
        entry: 'src/FlipBook.tsx',
        formats: ['es'],
        fileName: 'flip-book'
      },
      rollupOptions: {
        external: ['react', 'react-dom'],
        makeAbsoluteExternalsRelative: true
      },
      terserOptions: {
        module: true,
        output: {
          comments: () => false
        },
        compress: {
          drop_console: true
        }
      }
    },
    esbuild: { legalComments: 'none' },
    plugins: [
      react(),
      reactRefresh(),
      tsconfigPaths(),
      checker({
        typescript: true
      }),
      dts({
        afterBuild: emittedFiles => {
          emittedFiles.forEach((content, filePath) => {
            if (filePath.includes('FlipBook')) {
              const newFilePath = filePath.replace(/FlipBook/g, 'flip-book')
              const newDir = path.dirname(newFilePath)

              // Ensure the directory exists
              if (!fs.existsSync(newDir)) {
                fs.mkdirSync(newDir, { recursive: true })
              }

              fs.renameSync(filePath, newFilePath)
              fs.writeFileSync(newFilePath, content)
              console.log(`Renamed ${filePath} to ${newFilePath}`)
            }
          })
        }
      })
    ]
  }
})

