import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/node/index',
  ],
  clean: true,
  declaration: true,
  externals: [
    'vite',
  ],
  rollup: {
    emitCJS: true,
  },
})
