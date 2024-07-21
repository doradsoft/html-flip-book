import fs from 'node:fs'
import path from 'node:path'
import reactRefresh from '@vitejs/plugin-react'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import packageJson from './package.json'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  return {
    mode,
    assetsInclude: ['**/*.md'],
    base: '',
    build: {
      sourcemap: !isProd,
      emptyOutDir: true,
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
    server: {
      open: true
    },
    plugins: [
      react(),
      {
        name: 'markdown-loader',
        transform (_export, id) {
          if (id.endsWith('.md')) {
            const mdContent = fs.readFileSync(id, 'utf-8')
            return {
              code: `export default ${JSON.stringify(mdContent)}`,
              map: null // provide source map if available
            }
          }
        }
      },
      reactRefresh(),
      tsconfigPaths(),
      checker({
        typescript: true
      }),
      {
        name: 'update-esm-package-props',
        generateBundle: (options, bundle) => {
          if (isProd) {
            for (const fileName in bundle) {
              if (fileName.startsWith('index-')) {
                fs.writeFile(
                  path.resolve(__dirname, './package.json'),
                  JSON.stringify(
                    { ...packageJson, main: `dist/${fileName}` },
                    null,
                    2
                  ),
                  err => {
                    if (err) throw err
                    console.log(
                      '\x1b[36m%s\x1b[0m',
                      '\nPackage ESM main entrypoint updated!\n\r'
                    )
                  }
                )
              }
            }
          }
        }
      }
    ]
  }
})
