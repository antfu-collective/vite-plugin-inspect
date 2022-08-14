import { join, resolve } from 'path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Unocss from 'unocss/vite'
import Inspect from '../node'

export default defineConfig((env) => ({
  base: '/__inspect/',

  resolve: {
    alias: {
      '~/': __dirname,
    },
  },

  plugins: [
    Vue(),
    Pages({
      pagesDir: 'pages',
    }),
    Components({
      dirs: ['components'],
      dts: join(__dirname, 'components.d.ts'),
      resolvers: [
        IconsResolver({
          componentPrefix: '',
        }),
      ],
    }),
    Icons(),
    Unocss(),
    Inspect({
      clientDir: env.command === 'serve' ? '../dist/client' : '../client',
    }),
    AutoImport({
      dts: join(__dirname, 'auto-imports.d.ts'),
      imports: ['vue', 'vue-router', '@vueuse/core'],
    }),
  ],

  optimizeDeps: {
    exclude: ['vite-hot-client'],
  },

  build: {
    target: 'esnext',
    outDir: resolve(__dirname, '../../dist/client'),
    minify: true,
    emptyOutDir: true,
  },
}))
