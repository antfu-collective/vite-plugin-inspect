import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/nuxt',
  ],
  clean: false,
  declaration: true,
  failOnWarn: false,
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
})
