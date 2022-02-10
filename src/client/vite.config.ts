import { resolve } from 'path'
import { join } from 'path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import WindiCSS from 'vite-plugin-windicss'
import OptimizationPersist from 'vite-plugin-optimize-persist'
import PkgConfig from 'vite-plugin-package-config'
import Inspect from '../node'

export default defineConfig({
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
      dirs: [
        'components',
      ],
      dts: join(__dirname, 'components.d.ts'),
      resolvers: [
        IconsResolver({
          componentPrefix: '',
        }),
      ],
    }),
    Icons(),
    WindiCSS({
      scan: {
        dirs: [
          __dirname,
        ],
      },
    }),
    Inspect({
      // include: /\.vue$/,
    }),
    PkgConfig({
      packageJsonPath: 'vite.config.json',
    }),
    OptimizationPersist(),
    AutoImport({
      dts: join(__dirname, 'auto-imports.d.ts'),
      imports: [
        'vue',
        'vue-router',
        '@vueuse/core',
      ],
    }),
  ],

  server: {
    fs: {
      strict: true,
    },
  },

  build: {
    outDir: resolve(__dirname, '../../dist/client'),
    minify: true,
    emptyOutDir: true,
  },

  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      '@vueuse/core',
    ],
    exclude: [
      'vue-demi',
    ],
  },
})
