import { join, resolve } from 'node:path'
import Vue from '@vitejs/plugin-vue'
import Unocss from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import Pages from 'vite-plugin-pages'
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
      'diff-match-patch-es',
    ],
  },

  future: {
    removePluginHookHandleHotUpdate: 'warn',
    removePluginHookSsrArgument: 'warn',
    removeServerModuleGraph: 'warn',
    removeServerHot: 'warn',
    removeServerTransformRequest: 'warn',
    removeSsrLoadModule: 'warn',
  },

  build: {
    target: 'esnext',
    outDir: resolve(__dirname, '../../dist/client'),
    minify: false, // 'esbuild',
    emptyOutDir: true,
  },
})
