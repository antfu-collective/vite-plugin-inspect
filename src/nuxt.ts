import type { Options } from './node'
import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import Inspect from './node'

export { Options as ModuleOptions }

export default defineNuxtModule<Options>({
  meta: {
    name: 'vite-plugin-inspect',
    configKey: 'inspect',
  },
  setup(options) {
    addVitePlugin(() => Inspect(options))
  },
}) as any
