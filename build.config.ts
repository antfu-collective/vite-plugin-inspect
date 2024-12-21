import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/nuxt',
    'src/dirs',
  ],
  clean: false,
  declaration: true,
  externals: [
    'vite',
    '@nuxt/kit',
    '@nuxt/schema',
  ],
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
    dts: {
      respectExternal: true,
    },
  },
  hooks: {
    'build:done': async () => {
      console.log('\nChecking client directory...')
      const [
        { createRequire },
        lstat,
        esmDirClient,
      ] = await Promise.all([
        import('node:module').then(m => m.default || m),
        import ('node:fs/promises').then(m => m.lstat),
        import('./dist/dirs.mjs').then(m => m.DIR_CLIENT),
      ])
      let stats = await lstat(esmDirClient)
      if (!stats.isDirectory()) {
        throw new Error('ESM: Client directory does not exist, review src/dirs.ts module!')
      }
      const cjsDirClient = createRequire(import.meta.url)('./dist/dirs.cjs').DIR_CLIENT
      stats = await lstat(cjsDirClient)
      if (!stats.isDirectory()) {
        throw new Error('CJS: Client directory does not exist, review src/dirs.ts module!')
      }
      console.log('Client directory ok!')
    },
  },
})
