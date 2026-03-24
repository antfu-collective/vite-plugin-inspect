import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    nuxt: 'src/nuxt.ts',
    dirs: 'src/dirs.ts',
  },
  clean: false,
  deps: {
    neverBundle: [
      'vite',
      '@nuxt/kit',
      '@nuxt/schema',
      '@vitejs/devtools-kit',
    ],
    alwaysBundle: [
      '@antfu/utils',
    ],
  },
  hooks: {
    'build:done': async () => {
      console.log('\nChecking client directory...')
      const [
        lstat,
        esmDirClient,
      ] = await Promise.all([
        import('node:fs/promises').then(m => m.lstat),
        import('./dist/dirs.mjs').then(m => m.DIR_CLIENT),
      ])
      const stats = await lstat(esmDirClient)
      if (!stats.isDirectory()) {
        throw new Error('ESM: Client directory does not exist, review src/dirs.ts module!')
      }
    },
  },
})
