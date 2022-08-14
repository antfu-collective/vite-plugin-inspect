import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import _debug from 'debug'
import { bold, green } from 'kolorist'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import sirv from 'sirv'
import type { FilterPattern } from '@rollup/pluginutils'
import { createFilter } from '@rollup/pluginutils'
import { createRPCServer } from 'vite-dev-rpc'
import type { ModuleInfo, PluginMetricInfo, RPCFunctions, TransformInfo } from '../types'

const debug = _debug('vite-plugin-inspect')

const _dirname =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url))

// initial tranform (load from fs)
const dummyLoadPluginName = '__load__'

export interface Options {
  /**
   * Enable the inspect plugin (could be some performance overhead)
   *
   * @default true
   */
  enabled?: boolean

  /**
   * Filter for modules to be inspected
   */
  include?: FilterPattern
  /**
   * Filter for modules to not be inspected
   */
  exclude?: FilterPattern
}

export default function PluginInspect(options: Options = {}): Plugin {
  const { enabled = true } = options

  if (!enabled) {
    return {
      name: 'vite-plugin-inspect',
    }
  }

  const filter = createFilter(options.include, options.exclude)

  let config: ResolvedConfig

  const transformMap: Record<string, TransformInfo[]> = {}
  const ssrTransformMap: Record<string, TransformInfo[]> = {}
  const idMap: Record<string, string> = {}
  const ssrIdMap: Record<string, string> = {}

  function hijackPlugin(plugin: Plugin) {
    if (plugin.transform) {
      debug('hijack plugin transform', plugin.name)
      const _transform = plugin.transform
      plugin.transform = async function (...args) {
        const code = args[0]
        const id = args[1]
        const ssr = args[2]?.ssr

        let map = ssr ? ssrTransformMap : transformMap
        const start = Date.now()
        const _result = await _transform.apply(this, args)
        const end = Date.now()

        const result = typeof _result === 'string' ? _result : _result?.code

        if (filter(id) && result != null) {
          // the last plugin must be `vite:import-analysis`, if it's already there, we reset the stack
          if (map[id] && map[id].slice(-1)[0]?.name === 'vite:import-analysis') delete map[id]
          // initial tranform (load from fs), add a dummy
          if (!map[id]) map[id] = [{ name: dummyLoadPluginName, result: code, start, end: start }]
          // record transform
          map[id].push({ name: plugin.name, result, start, end })
        }

        return _result
      }
    }

    if (plugin.load) {
      debug('hijack plugin load', plugin.name)
      const _load = plugin.load
      plugin.load = async function (...args) {
        const id = args[0]
        const ssr = args[1]?.ssr
        const start = Date.now()
        const _result = await _load.apply(this, args)
        const end = Date.now()

        const result = typeof _result === 'string' ? _result : _result?.code

        let map = ssr ? ssrTransformMap : transformMap
        if (filter(id) && result != null) map[id] = [{ name: plugin.name, result, start, end }]

        return _result
      }
    }

    if (plugin.resolveId) {
      debug('hijack plugin resolveId', plugin.name)
      const _resolveId = plugin.resolveId
      plugin.resolveId = async function (...args) {
        const id = args[0]
        const ssr = args[2]?.ssr
        const _result = await _resolveId.apply(this, args)

        const result = typeof _result === 'object' ? _result?.id : _result

        if (!id.startsWith('./') && result && result !== id) (ssr ? ssrIdMap : idMap)[id] = result

        return _result
      }
    }
  }

  function resolveId(id = '', ssr: boolean): string {
    if (id.startsWith('./')) id = resolve(config.root, id).replace(/\\/g, '/')
    return resolveIdRec(id, ssr)
  }

  function resolveIdRec(id: string, ssr: boolean): string {
    const map = ssr ? ssrIdMap : idMap
    return map[id] ? resolveIdRec(map[id], ssr) : id
  }

  function getIdInfo(id: string, ssr = false) {
    const resolvedId = resolveId(id, ssr)
    return {
      resolvedId,
      transforms: (ssr ? ssrTransformMap : transformMap)[resolvedId] || [],
    }
  }

  function getPluginMetrics(ssr?: boolean) {
    const map: Record<string, PluginMetricInfo> = {}

    config.plugins.forEach((i) => {
      map[i.name] = {
        name: i.name,
        enforce: i.enforce,
        invokeCount: 0,
        totalTime: 0,
      }
    })

    Object.values(ssr ? ssrTransformMap : transformMap).forEach((transformInfos) => {
      transformInfos.forEach(({ name, start, end }) => {
        if (name === dummyLoadPluginName) return
        if (!map[name]) map[name] = { name, totalTime: 0, invokeCount: 0 }
        map[name].totalTime += end - start
        map[name].invokeCount += 1
      })
    })

    const metrics = Object.values(map)
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => b.invokeCount - a.invokeCount)
      .sort((a, b) => b.totalTime - a.totalTime)

    return metrics
  }

  function configureServer(server: ViteDevServer) {
    const _invalidateModule = server.moduleGraph.invalidateModule
    server.moduleGraph.invalidateModule = function (...args) {
      const mod = args[0]
      if (mod?.id) {
        delete transformMap[mod.id]
        delete ssrTransformMap[mod.id]
      }
      return _invalidateModule.apply(this, args)
    }

    server.middlewares.use(
      '/__inspect',
      sirv(resolve(_dirname, '../dist/client'), {
        single: true,
        dev: true,
      })
    )

    async function preloadSSRModule(id: string) {
      try {
        await server.ssrLoadModule(id)
        return {}
      } catch (e) {
        console.error(e)
        return {}
      }
    }

    createRPCServer<RPCFunctions>('vite-plugin-inspect', server.ws, {
      list,
      getIdInfo,
      getPluginMetrics,
      resolveId,
      clear,
      preloadSSRModule,
    })

    function list() {
      const modules: {
        [k: string]: { client: null | ModuleInfo; ssr: null | ModuleInfo }
      } = {}

      Object.keys(transformMap).forEach((id) => {
        const plugins = transformMap[id]?.map((i) => i.name)
        const deps = Array.from(server.moduleGraph.getModuleById(id)?.importedModules || [])
          .map((i) => i.id || '')
          .filter(Boolean)

        modules[id] = modules[id] ?? {}
        modules[id].client = {
          id,
          plugins,
          deps,
          ssr: false,
          virtual: plugins[0] !== '__load__',
        }
      })

      Object.keys(ssrTransformMap).forEach((id) => {
        const plugins = ssrTransformMap[id]?.map((i) => i.name)
        const deps = Array.from(server.moduleGraph.getModuleById(id)?.importedModules || [])
          .map((i) => i.id || '')
          .filter(Boolean)

        modules[id] = modules[id] ?? {}
        modules[id].ssr = {
          id,
          plugins,
          deps,
          ssr: true,
          virtual: plugins[0] !== '__load__',
        }
      })

      return {
        root: config.root,
        modules: Object.keys(modules)
          .sort()
          .map((id) => modules[id]),
      }
    }

    function clear(_id?: string) {
      for (var i of [true, false]) {
        const id = resolveId(_id, i)
        if (id) {
          const mod = server.moduleGraph.getModuleById(id)
          if (mod) server.moduleGraph.invalidateModule(mod)
          delete transformMap[id]
          delete ssrTransformMap[id]
        }
      }
    }

    const _print = server.printUrls
    server.printUrls = () => {
      const colorUrl = (url: string) =>
        green(url.replace(/:(\d+)\//, (_, port) => `:${bold(port)}/`))
      const host =
        server.resolvedUrls?.local[0] ||
        `${config.server.https ? 'https' : 'http'}://localhost:${config.server.port || '80'}/`
      _print()
      // eslint-disable-next-line no-console
      console.log(`  ${green('➜')}  ${bold('Inspect')}: ${colorUrl(`${host}__inspect/`)}\n`)
    }
  }

  return <Plugin>{
    name: 'vite-plugin-inspect',
    apply: 'serve',
    configResolved(_config) {
      config = _config
      config.plugins.forEach(hijackPlugin)
    },
    configureServer,
  }
}
