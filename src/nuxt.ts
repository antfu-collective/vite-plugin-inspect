import type { ViteInspectOptions } from './node'
import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import Inspect from './node'

export { ViteInspectOptions as ModuleOptions }

export default defineNuxtModule<ViteInspectOptions>({
  meta: {
    name: 'vite-plugin-inspect',
    configKey: 'inspect',
  },
  setup(options: any) {
    addVitePlugin(() => Inspect(options))
  },
}) as any
