import type { Plugin } from 'vite'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { DevTools } from '@vitejs/devtools'
import Vue from '@vitejs/plugin-vue'
import Unocss from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { VueRouterAutoImports } from 'vue-router/unplugin'
import VueRouter from 'vue-router/vite'
import Inspect from '../node'

const plugins: () => Promise<Plugin[]> = process.env.VITE_DEVTOOLS_LOCAL_DEV
  ? DevTools
  : async () => {
    const devtools = await DevTools()

    const devtoolsPlugin = devtools.filter(p => p.name !== 'vite:devtools:injection')
    return [
      ...devtoolsPlugin,
      <Plugin>{
        name: 'devtools:plugin:injector',
        enforce: 'post',
        apply: 'build',
        transformIndexHtml() {
          return [{
            tag: 'script',
            attrs: {
              src: 'vite-plugin-inspect-devtools-injector.js',
              type: 'module',
            },
            injectTo: 'body',
          }]
        },
      },
    ]
  }

export default defineConfig({
  base: './',

  resolve: {
    alias: {
      '~/': __dirname,
    },
  },

  plugins: [
    plugins(),
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
    VueRouter({
      // logs: true,
      root: __dirname,
      routesFolder: 'pages',
    }),
    Components({
      dirs: ['components'],
      dts: join(__dirname, 'components.d.ts'),
    }),
    Unocss(),
    Inspect({
      // embedded: true,
    }),
    AutoImport({
      dts: join(__dirname, 'auto-imports.d.ts'),
      imports: [
        'vue',
        VueRouterAutoImports,
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
