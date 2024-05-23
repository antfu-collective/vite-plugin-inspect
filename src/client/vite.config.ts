import { join, resolve } from 'node:path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Unocss from 'unocss/vite'
import Inspect from '../node'

export default defineConfig({
  base: './',

  resolve: {
    alias: {
      '~/': __dirname,
    },
  },

  plugins: [
    {
      name: 'local:object-hook-transform',
      transform: {
        order: 'post',
        async handler(code) {
          return `${code}\n/* Injected with object hook! */`
        },
      },
    },
    {
      name: 'local:generate-error',
      load(id) {
        if (id === '/__LOAD_ERROR')
          throw new Error('Load error')
        if (id === '/__TRANSFORM_ERROR')
          return 'transform'
      },
      transform(code, id) {
        if (id === '/__TRANSFORM_ERROR')
          throw new SyntaxError('Transform error')
      },
    },

    {
      name: 'local:no-change',
      transform: {
        order: 'post',
        async handler(code) {
          return code
        },
      },
    },

    Vue({
      script: {
        defineModel: true,
      },
    }),
    Pages({
      pagesDir: 'pages',
    }),
    Components({
      dirs: ['components'],
      dts: join(__dirname, 'components.d.ts'),
    }),
    Unocss(),
    Inspect(),
    AutoImport({
      dts: join(__dirname, 'auto-imports.d.ts'),
      imports: [
        'vue',
        'vue-router',
        '@vueuse/core',
      ],
    }),
  ],

  optimizeDeps: {
    exclude: [
      'vite-hot-client',
    ],
  },

  build: {
    target: 'esnext',
    outDir: resolve(__dirname, '../../dist/client'),
    minify: false, // 'esbuild',
    emptyOutDir: true,
  },
})
