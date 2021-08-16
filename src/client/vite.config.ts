import { resolve } from 'path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'
import ViteIcons, { ViteIconsResolver } from 'vite-plugin-icons'
import ViteComponents from 'vite-plugin-components'
import WindiCSS from 'vite-plugin-windicss'

export default defineConfig({
  base: '/__inspect',

  plugins: [
    Vue(),
    Pages({
      pagesDir: 'pages',
    }),
    ViteComponents({
      dirs: [
        'components',
      ],
      globalComponentsDeclaration: true,
      customComponentResolvers: [
        ViteIconsResolver({
          componentPrefix: '',
        }),
      ],
    }),
    ViteIcons(),
    WindiCSS({
      scan: {
        dirs: [
          __dirname,
        ],
      },
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
