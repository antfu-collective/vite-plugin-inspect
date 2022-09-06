import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import _debug from 'debug'
import { bold, green } from 'kolorist'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import type { ObjectHook } from 'rollup'
import sirv from 'sirv'
import type { FilterPattern } from '@rollup/pluginutils'
import { createFilter } from '@rollup/pluginutils'
import { createRPCServer } from 'vite-dev-rpc'
import type { ModuleInfo, PluginMetricInfo, RPCFunctions, TransformInfo } from '../types'

const debug = _debug('vite-plugin-inspect')

const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

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

export type HookHandler<T> = T extends ObjectHook<infer F> ? F : T
export type HookWrapper<K extends keyof Plugin> = (
  fn: NonNullable<HookHandler<Plugin[K]>>,
  context: ThisParameterType<NonNullable<HookHandler<Plugin[K]>>>,
  args: NonNullable<Parameters<HookHandler<Plugin[K]>>>,
  order: string
) => ReturnType<HookHandler<Plugin[K]>>

export default function PluginInspect(options: Options = {}): Plugin {
  const {
    enabled = true,
  } = options

  if (!enabled) {
    return {
      name: 'vite-plugin-inspect',
    }
  }

  const filter = createFilter(options.include, options.exclude)

  let config: ResolvedConfig

  const transformMap: Record<string, TransformInfo[]> = {}
  const idMap: Record<string, string> = {}

  function hijackHook<K extends keyof Plugin>(plugin: Plugin, name: K, wrapper: HookWrapper<K>) {
    if (!plugin[name])
      return

    debug(`hijack plugin "${name}"`, plugin.name)

    // @ts-expect-error future
    let order = plugin.order || plugin.enforce || 'normal'

    const hook = plugin[name] as any
    if ('handler' in hook) {
      // rollup hook
      const oldFn = hook.handler
      order += `-${hook.order || hook.enforce || 'normal'}`
      hook.handler = function (this: any, ...args: any) { return wrapper(oldFn, this, args, order) }
    }
    else if ('transform' in hook) {
      // transformIndexHTML
      const oldFn = hook.transform
      order += `-${hook.order || hook.enforce || 'normal'}`
      hook.transform = function (this: any, ...args: any) { return wrapper(oldFn, this, args, order) }
    }
    else {
      // vite hook
      const oldFn = hook
      plugin[name] = function (this: any, ...args: any) { return wrapper(oldFn, this, args, order) }
    }
  }

  function hijackPlugin(plugin: Plugin) {
    hijackHook(plugin, 'transform', async (fn, context, args, order) => {
      const code = args[0]
      const id = args[1]
      const start = Date.now()
      const _result = await fn.apply(context, args)
      const end = Date.now()

      const result = typeof _result === 'string' ? _result : _result?.code

      if (filter(id) && result != null) {
        // initial tranform (load from fs), add a dummy
        if (!transformMap[id])
          transformMap[id] = [{ name: dummyLoadPluginName, result: code, start, end: start }]
        // record transform
        transformMap[id].push({ name: plugin.name, result, start, end, order })
      }

      return _result
    })

    hijackHook(plugin, 'load', async (fn, context, args) => {
      const id = args[0]
      const start = Date.now()
      const _result = await fn.apply(context, args)
      const end = Date.now()

      const result = typeof _result === 'string' ? _result : _result?.code

      if (filter(id) && result != null)
        transformMap[id] = [{ name: plugin.name, result, start, end }]

      return _result
    })

    hijackHook(plugin, 'resolveId', async (fn, context, args) => {
      const id = args[0]
      const _result = await fn.apply(context, args)

      const result = typeof _result === 'object' ? _result?.id : _result

      if (!id.startsWith('./') && result && result !== id)
        idMap[id] = result

      return _result
    })
  }

  function resolveId(id = ''): string {
    if (id.startsWith('./'))
      id = resolve(config.root, id).replace(/\\/g, '/')
    return resolveIdRec(id)
  }

  function resolveIdRec(id: string): string {
    return idMap[id]
      ? resolveIdRec(idMap[id])
      : id
  }

  function getIdInfo(id: string) {
    const resolvedId = resolveId(id)
    return {
      resolvedId,
      transforms: transformMap[resolvedId] || [],
    }
  }

  function getPluginMetics() {
    const map: Record<string, PluginMetricInfo> = {}

    config.plugins.forEach((i) => {
      map[i.name] = {
        name: i.name,
        enforce: i.enforce,
        invokeCount: 0,
        totalTime: 0,
      }
    })

    Object.values(transformMap)
      .forEach((transformInfos) => {
        transformInfos.forEach(({ name, start, end }) => {
          if (name === dummyLoadPluginName)
            return
          if (!map[name])
            map[name] = { name, totalTime: 0, invokeCount: 0 }
          map[name].totalTime += end - start
          map[name].invokeCount += 1
        })
      })

    const metrics = Object.values(map).filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => b.invokeCount - a.invokeCount)
      .sort((a, b) => b.totalTime - a.totalTime)

    return metrics
  }

  function configureServer(server: ViteDevServer) {
    const _invalidateModule = server.moduleGraph.invalidateModule
    server.moduleGraph.invalidateModule = function (...args) {
      const mod = args[0]
      if (mod?.id)
        delete transformMap[mod.id]
      return _invalidateModule.apply(this, args)
    }

    server.middlewares.use('/__inspect', sirv(resolve(_dirname, '../dist/client'), {
      single: true,
      dev: true,
    }))

    createRPCServer<RPCFunctions>('vite-plugin-inspect', server.ws, {
      list,
      getIdInfo,
      getPluginMetics,
      resolveId,
      clear,
    })

    function list() {
      const modules = Object.keys(transformMap).sort()
        .map((id): ModuleInfo => {
          const plugins = transformMap[id]?.map(i => i.name)
          const deps = Array.from(server.moduleGraph.getModuleById(id)?.importedModules || [])
            .map(i => i.id || '')
            .filter(Boolean)
          return {
            id,
            plugins,
            deps,
            virtual: plugins[0] !== '__load__',
          }
        })

      return {
        root: config.root,
        modules,
      }
    }

    function clear(_id?: string) {
      const id = resolveId(_id)
      if (id) {
        const mod = server.moduleGraph.getModuleById(id)
        if (mod)
          server.moduleGraph.invalidateModule(mod)
        delete transformMap[id]
      }
    }

    const _print = server.printUrls
    server.printUrls = () => {
      const colorUrl = (url: string) => green(url.replace(/:(\d+)\//, (_, port) => `:${bold(port)}/`))
      const host = server.resolvedUrls?.local[0] || `${config.server.https ? 'https' : 'http'}://localhost:${config.server.port || '80'}/`
      _print()
      // eslint-disable-next-line no-console
      console.log(`  ${green('➜')}  ${bold('Inspect')}: ${colorUrl(`${host}__inspect/`)}\n`)
    }
  }

  return <Plugin>{
    name: 'vite-plugin-inspect',
    enforce: 'pre',
    apply: 'serve',
    configResolved(_config) {
      config = _config
      config.plugins.forEach(hijackPlugin)
    },
    configureServer,
    load: {
      order: 'pre',
      handler(id) {
        delete transformMap[id]
        return null
      },
    },
  }
}
