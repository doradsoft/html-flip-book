import fs from 'node:fs';
import path from 'node:path';
import reactRefresh from '@vitejs/plugin-react-refresh';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';
import packageJson from './package.json';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  return {
    mode,
    build: {
      sourcemap: !isProd,
      emptyOutDir: true,
      assetsDir: '',
      rollupOptions: {
        external: ['react', 'react-dom'],
      },
      terserOptions: {
        module: true,
        output: {
          comments: () => false,
        },
        compress: {
          drop_console: true,
        },
      },
    },
    esbuild: { legalComments: 'none' },
    server: {
      open: true,
    },
    plugins: [
      react(),
      reactRefresh(),
      svgr(),
      tsconfigPaths(),
      checker({
        typescript: true,
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
                    2,
                  ),
                  (err) => {
                    if (err) throw err;
                    console.log(
                      '\x1b[36m%s\x1b[0m',
                      '\nPackage ESM main entrypoint updated!\n\r',
                    );
                  },
                );
              }
            }
          }
        },
      },
    ],
  };
});
