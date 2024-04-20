import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Inspect from 'vite-plugin-inspect'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    open: true,
  },
  plugins: [
    vue(),
    {
      name: 'custom-loader',
      resolveId(id) {
        return id === 'virtual:hi' ? `\0${id}` : undefined
      },
      load(id) {
        if (id === '\0virtual:hi')
          return 'export default \'Hi!\''
      },
    },
    Inspect({
      build: true,
      open: true,
    }),
  ],
})
