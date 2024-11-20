import type { ResolvedConfig, ViteDevServer } from 'vite'
import type { ModuleInfo, PluginMetricInfo, ResolveIdInfo } from '../types'
import { Buffer } from 'node:buffer'
import { resolve } from 'node:path'
import { createFilter } from '@rollup/pluginutils'
import { DUMMY_LOAD_PLUGIN_NAME } from './constants'
import { Recorder } from './recorder'
import { removeVersionQuery } from './utils'

export class ViteInspectContext {
  public filter: (id: string) => boolean
  public config: ResolvedConfig = undefined!

  public recorderClient: Recorder
  public recorderServer: Recorder

  constructor(public options: any) {
    this.filter = createFilter(options.include, options.exclude)
    this.recorderClient = new Recorder(this)
    this.recorderServer = new Recorder(this)
  }

  normalizeId(id: string) {
    if (this.options.removeVersionQuery !== false)
      return removeVersionQuery(id)
    return id
  }

  getRecorder(ssr: boolean | undefined) {
    return ssr
      ? this.recorderServer
      : this.recorderClient
  }

  resolveId(id = '', ssr = false): string {
    if (id.startsWith('./'))
      id = resolve(this.config.root, id).replace(/\\/g, '/')
    return this.resolveIdRecursive(id, ssr)
  }

  private resolveIdRecursive(id: string, ssr = false): string {
    const rec = this.getRecorder(ssr)
    const resolved = rec.resolveId[id]?.[0]?.result
    return resolved
      ? this.resolveIdRecursive(resolved, ssr)
      : id
  }

  getList(server: ViteDevServer) {
    const isVirtual = (pluginName: string) => pluginName !== DUMMY_LOAD_PLUGIN_NAME
    const getDeps = (id: string) => Array.from(server.moduleGraph.getModuleById(id)?.importedModules || [])
      .map(i => i.id || '')
      .filter(Boolean)

    return {
      root: this.config.root,
      modules: this.getModulesInfo(this.recorderClient, getDeps, isVirtual),
      ssrModules: this.getModulesInfo(this.recorderServer, getDeps, isVirtual),
    }
  }

  getModulesInfo(
    recorder: Recorder,
    getDeps: ((id: string) => string[]) | null,
    isVirtual: (pluginName: string, transformName: string) => boolean,
  ) {
    function transformIdMap(recorder: Recorder) {
      return Object.values(recorder.resolveId).reduce((map, ids) => {
        ids.forEach((id) => {
          map[id.result] ??= []
          map[id.result].push(id)
        })
        return map
      }, {} as Record<string, ResolveIdInfo[]>)
    }

    const transformedIdMap = transformIdMap(recorder)
    const ids = new Set(Object.keys(recorder.transform).concat(Object.keys(transformedIdMap)))

    return Array.from(ids).sort().map((id): ModuleInfo => {
      let totalTime = 0
      const plugins = (recorder.transform[id] || [])
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
        virtual: isVirtual(plugins[0]?.name || '', recorder.transform[id]?.[0].name || ''),
        totalTime,
        invokeCount: recorder.transformCounter?.[id] || 0,
        sourceSize: getSize(recorder.transform[id]?.[0]?.result),
        distSize: getSize(recorder.transform[id]?.[recorder.transform[id].length - 1]?.result),
      }
    })
  }

  getPluginMetrics(ssr = false) {
    const map: Record<string, PluginMetricInfo> = {}
    const defaultMetricInfo = (): Pick<PluginMetricInfo, 'transform' | 'resolveId'> => ({
      transform: { invokeCount: 0, totalTime: 0 },
      resolveId: { invokeCount: 0, totalTime: 0 },
    })

    this.config.plugins.forEach((i) => {
      map[i.name] = {
        ...defaultMetricInfo(),
        name: i.name,
        enforce: i.enforce,
      }
    })

    const recorder = this.getRecorder(ssr)
    Object.values(recorder.transform)
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

    Object.values(recorder.resolveId)
      .forEach((resolveIdInfos) => {
        resolveIdInfos.forEach(({ name, start, end }) => {
          if (!map[name])
            map[name] = { ...defaultMetricInfo(), name }
          map[name].resolveId.totalTime += end - start
          map[name].resolveId.invokeCount += 1
        })
      })

    const metrics = Object.values(map).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name))

    return metrics
  }
}
