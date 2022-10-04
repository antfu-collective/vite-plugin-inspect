import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Inspect from 'vite-plugin-inspect'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/test/',
  plugins: [
    vue(),
    Inspect({
      build: true,
    }),
  ],
})
