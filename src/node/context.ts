import { Buffer } from 'node:buffer'
import type { PluginEnvironment, ResolvedConfig } from 'vite'
import type { FilterPattern } from '@rollup/pluginutils'
import { createFilter } from '@rollup/pluginutils'
import type { ModuleInfo, ResolveIdInfo } from '../types'
import { Recorder } from './recorder'
import { DUMMY_LOAD_PLUGIN_NAME } from './constants'

let viteCount = 0

export class InspectContext {
  _configToInstances = new Map<ResolvedConfig, InspectContextVite>()
  _idToInstances = new Map<string, InspectContextVite>()

  public filter: (id: string) => boolean

  constructor(
    public options: {
      /**
       * Filter for modules to be inspected
       */
      include?: FilterPattern
      /**
       * Filter for modules to not be inspected
       */
      exclude?: FilterPattern
    },
  ) {
    this.filter = createFilter(options.include, options.exclude)
  }

  getViteContext(configOrId: ResolvedConfig | string): InspectContextVite {
    if (typeof configOrId === 'string') {
      if (!this._idToInstances.has(configOrId))
        throw new Error(`Can not found vite context for ${configOrId}`)
      return this._idToInstances.get(configOrId)!
    }

    if (this._configToInstances.has(configOrId))
      return this._configToInstances.get(configOrId)!
    const id = `vite${viteCount++}`
    const vite = new InspectContextVite(id, this, configOrId)
    this._idToInstances.set(id, vite)
    this._configToInstances.set(configOrId, vite)
    return vite
  }

  getEnvContext(env?: PluginEnvironment) {
    if (!env)
      throw new Error('Environment is required')
    const vite = this.getViteContext(env.config)
    return vite.getEnvContext(env)
  }
}

export class InspectContextVite {
  readonly environments = new Map<string, InspectContextViteEnv>()

  constructor(
    public readonly id: string,
    public readonly context: InspectContext,
    public readonly config: ResolvedConfig,
  ) {}

  getEnvContext(env: PluginEnvironment | string) {
    if (typeof env === 'string') {
      if (!this.environments.has(env))
        throw new Error(`Can not found environment context for ${env}`)
      return this.environments.get(env)!
    }

    if (env.config !== this.config)
      throw new Error('Environment config does not match Vite config')
    if (!this.environments.has(env.name))
      this.environments.set(env.name, new InspectContextViteEnv(this.context, this, env))
    return this.environments.get(env.name)!
  }
}

export class InspectContextViteEnv extends Recorder {
  constructor(
    public readonly contextMain: InspectContext,
    public readonly contextVite: InspectContextVite,
    public readonly env: PluginEnvironment,
  ) {
    super()
  }

  getModulesList() {
    const moduleGraph = this.env.mode === 'dev' ? this.env.moduleGraph : undefined

    const getDeps = (id: string) => Array.from(moduleGraph?.getModuleById(id)?.importedModules || [])
      .map(i => i.id || '')
      .filter(Boolean)
    const isVirtual = (pluginName: string, transformName: string) => pluginName !== DUMMY_LOAD_PLUGIN_NAME && transformName !== 'vite:load-fallback'

    const transformedIdMap = Object.values(this.resolveId).reduce((map, ids) => {
      ids.forEach((id) => {
        map[id.result] ??= []
        map[id.result].push(id)
      })
      return map
    }, {} as Record<string, ResolveIdInfo[]>)

    const ids = new Set(Object.keys(this.transform)
      .concat(Object.keys(transformedIdMap)))

    return Array.from(ids).sort()
      .map((id): ModuleInfo => {
        let totalTime = 0
        const plugins = (this.transform[id] || [])
          .filter(tr => tr.result)
          .map((transItem) => {
            const delta = transItem.end - transItem.start
            totalTime += delta
            return { name: transItem.name, transform: delta }
          })
          .concat(
            // @ts-expect-error transform is optional
            (transformedIdMap[id] || []).map((idItem) => {
              return { name: idItem.name, resolveId: idItem.end - idItem.start }
            }),
          )

        function getSize(str: string | undefined) {
          if (!str)
            return 0
          return Buffer.byteLength(str, 'utf8')
        }

        return {
          id,
          deps: getDeps ? getDeps(id) : [],
          plugins,
          virtual: isVirtual(plugins[0]?.name || '', this.transform[id]?.[0].name || ''),
          totalTime,
          invokeCount: this.transformCounter?.[id] || 0,
          sourceSize: getSize(this.transform[id]?.[0]?.result),
          distSize: getSize(this.transform[id]?.[this.transform[id].length - 1]?.result),
        }
      })
  }
}
