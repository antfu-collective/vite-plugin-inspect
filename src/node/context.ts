import { Buffer } from 'node:buffer'
import { resolve } from 'node:path'
import type { Environment, ResolvedConfig } from 'vite'
import { createFilter } from '@rollup/pluginutils'
import type { Metadata, ModuleInfo, PluginMetricInfo, QueryEnv, ResolveIdInfo, ServerMetrics, TransformInfo } from '../types'
import { DUMMY_LOAD_PLUGIN_NAME } from './constants'
import type { ViteInspectOptions } from './options'
import { serializePlugin } from './utils'

let viteCount = 0

export class InspectContext {
  _configToInstances = new Map<ResolvedConfig, InspectContextVite>()
  _idToInstances = new Map<string, InspectContextVite>()

  public filter: (id: string) => boolean

  constructor(
    public options: ViteInspectOptions,
  ) {
    this.filter = createFilter(options.include, options.exclude)
  }

  getMetadata(): Metadata {
    return {
      instances: [...this._idToInstances.values()]
        .map(vite => ({
          root: vite.config.root,
          vite: vite.id,
          plugins: vite.config.plugins.map(i => serializePlugin(i)),
          environments: [...vite.environments.keys()],
          environmentPlugins: Object.fromEntries(
            [...vite.environments.entries()]
              .map(([name, env]) => {
                return [name, env.env.config.plugins.map(i => vite.config.plugins.indexOf(i))]
              }),
          ),
        })),
    }
  }

  getViteContext(configOrId: ResolvedConfig | string): InspectContextVite {
    if (typeof configOrId === 'string') {
      if (!this._idToInstances.has(configOrId))
        throw new Error(`Can not found vite context for ${configOrId}`)
      return this._idToInstances.get(configOrId)!
    }

    if (this._configToInstances.has(configOrId))
      return this._configToInstances.get(configOrId)!
    const id = `vite${++viteCount}`
    const vite = new InspectContextVite(id, this, configOrId)
    this._idToInstances.set(id, vite)
    this._configToInstances.set(configOrId, vite)
    return vite
  }

  getEnvContext(env?: Environment) {
    if (!env)
      throw new Error('Environment is required')
    const vite = this.getViteContext(env.config)
    return vite.getEnvContext(env)
  }

  queryEnv(query: QueryEnv) {
    const vite = this.getViteContext(query.vite)
    const env = vite.getEnvContext(query.env)
    return env
  }
}

export class InspectContextVite {
  readonly environments = new Map<string, InspectContextViteEnv>()

  data: { serverMetrics: ServerMetrics } = {
    serverMetrics: {
      middleware: {},
    },
  }

  constructor(
    public readonly id: string,
    public readonly context: InspectContext,
    public readonly config: ResolvedConfig,
  ) {}

  getEnvContext(env: Environment | string) {
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

export class InspectContextViteEnv {
  constructor(
    public readonly contextMain: InspectContext,
    public readonly contextVite: InspectContextVite,
    public readonly env: Environment,
  ) {}

  data: {
    transform: Record<string, TransformInfo[]>
    resolveId: Record<string, ResolveIdInfo[]>
    transformCounter: Record<string, number>
  } = {
      transform: {},
      resolveId: {},
      transformCounter: {},
    }

  recordTransform(id: string, info: TransformInfo, preTransformCode: string) {
    // initial transform (load from fs), add a dummy
    if (!this.data.transform[id] || !this.data.transform[id].some(tr => tr.result)) {
      this.data.transform[id] = [{
        name: DUMMY_LOAD_PLUGIN_NAME,
        result: preTransformCode,
        start: info.start,
        end: info.start,
        sourcemaps: info.sourcemaps,
      }]
      this.data.transformCounter[id] = (this.data.transformCounter[id] || 0) + 1
    }
    // record transform
    this.data.transform[id].push(info)
  }

  recordLoad(id: string, info: TransformInfo) {
    this.data.transform[id] = [info]
    this.data.transformCounter[id] = (this.data.transformCounter[id] || 0) + 1
  }

  recordResolveId(id: string, info: ResolveIdInfo) {
    if (!this.data.resolveId[id])
      this.data.resolveId[id] = []
    this.data.resolveId[id].push(info)
  }

  invalidate(id: string) {
    delete this.data.transform[id]
  }

  getModulesList() {
    const moduleGraph = this.env.mode === 'dev' ? this.env.moduleGraph : undefined

    const getDeps = (id: string) => Array.from(moduleGraph?.getModuleById(id)?.importedModules || [])
      .map(i => i.id || '')
      .filter(Boolean)

    const getImporters = (id: string) => Array.from(moduleGraph?.getModuleById(id)?.importers || [])
      .map(i => i.id || '')
      .filter(Boolean)

    function isVirtual(pluginName: string, transformName: string) {
      return pluginName !== DUMMY_LOAD_PLUGIN_NAME && transformName !== 'vite:load-fallback' && transformName !== 'vite:build-load-fallback'
    }

    const transformedIdMap = Object.values(this.data.resolveId).reduce((map, ids) => {
      ids.forEach((id) => {
        map[id.result] ??= []
        map[id.result].push(id)
      })
      return map
    }, {} as Record<string, ResolveIdInfo[]>)

    const ids = new Set(Object.keys(this.data.transform)
      .concat(Object.keys(transformedIdMap)))

    return Array.from(ids).sort()
      .map((id): ModuleInfo => {
        let totalTime = 0
        const plugins = (this.data.transform[id] || [])
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
          deps: getDeps(id),
          importers: getImporters(id),
          plugins,
          virtual: isVirtual(plugins[0]?.name || '', this.data.transform[id]?.[0].name || ''),
          totalTime,
          invokeCount: this.data.transformCounter?.[id] || 0,
          sourceSize: getSize(this.data.transform[id]?.[0]?.result),
          distSize: getSize(this.data.transform[id]?.[this.data.transform[id].length - 1]?.result),
        }
      })
  }

  resolveId(id = '', ssr = false): string {
    if (id.startsWith('./'))
      id = resolve(this.env.config.root, id).replace(/\\/g, '/')
    return this.resolveIdRecursive(id, ssr)
  }

  private resolveIdRecursive(id: string, ssr = false): string {
    const resolved = this.data.resolveId[id]?.[0]?.result
    return resolved
      ? this.resolveIdRecursive(resolved, ssr)
      : id
  }

  getPluginMetrics() {
    const map: Record<string, PluginMetricInfo> = {}

    const defaultMetricInfo = (): Pick<PluginMetricInfo, 'transform' | 'resolveId'> => ({
      transform: { invokeCount: 0, totalTime: 0 },
      resolveId: { invokeCount: 0, totalTime: 0 },
    })

    this.env.config.plugins.forEach((i) => {
      map[i.name] = {
        ...defaultMetricInfo(),
        name: i.name,
        enforce: i.enforce,
      }
    })

    Object.values(this.data.transform)
      .forEach((transformInfos) => {
        transformInfos.forEach(({ name, start, end }) => {
          if (name === DUMMY_LOAD_PLUGIN_NAME)
            return
          if (!map[name])
            map[name] = { ...defaultMetricInfo(), name }
          map[name].transform.totalTime += end - start
          map[name].transform.invokeCount += 1
        })
      })

    Object.values(this.data.resolveId)
      .forEach((resolveIdInfos) => {
        resolveIdInfos.forEach(({ name, start, end }) => {
          if (!map[name])
            map[name] = { ...defaultMetricInfo(), name }
          map[name].resolveId.totalTime += end - start
          map[name].resolveId.invokeCount += 1
        })
      })

    const metrics = Object.values(map).filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name))

    return metrics
  }

  async getModuleTransformInfo(id: string, clear = false) {
    if (clear) {
      this.clearId(id)
      try {
        if (this.env.mode === 'dev')
          await this.env.transformRequest(id)
      }
      catch {}
    }
    const resolvedId = this.resolveId(id)
    return {
      resolvedId,
      transforms: this.data.transform[resolvedId] || [],
    }
  }

  clearId(_id: string) {
    const id = this.resolveId(_id)
    if (id) {
      const moduleGraph = this.env.mode === 'dev' ? this.env.moduleGraph : undefined
      const mod = moduleGraph?.getModuleById(id)
      if (mod)
        moduleGraph?.invalidateModule(mod)
      this.invalidate(id)
    }
  }
}
