import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/nuxt',
    'src/dirs',
  ],
  clean: false,
  declaration: 'node16',
  externals: [
    'vite',
    '@nuxt/kit',
    '@nuxt/schema',
  ],
  rollup: {
    inlineDependencies: [
      '@antfu/utils',
    ],
    dts: {
      respectExternal: true,
    },
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
