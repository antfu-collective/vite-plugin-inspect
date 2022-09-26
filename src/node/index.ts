import { join, resolve } from 'path'
import fs from 'fs-extra'
import _debug from 'debug'
import { bold, dim, green } from 'kolorist'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import type { ObjectHook } from 'rollup'
import sirv from 'sirv'
import type { FilterPattern } from '@rollup/pluginutils'
import { createFilter } from '@rollup/pluginutils'
import { createRPCServer } from 'vite-dev-rpc'
import { hash } from 'ohash'
import type { HMRData, ModuleInfo, ModuleTransformInfo, PluginMetricInfo, RPCFunctions, TransformInfo } from '../types'
import { DIR_CLIENT } from '../dir'

const debug = _debug('vite-plugin-inspect')

// initial tranform (load from fs)
const dummyLoadPluginName = '__load__'

export interface Options {
  /**
   * Enable the inspect plugin in dev mode (could be some performance overhead)
   *
   * @default true
   */
  dev?: boolean

  /**
   * Enable the inspect plugin in build mode, and output the report to `.vite-inspect`
   *
   * @default false
   */
  build?: boolean

  /**
   * @deprecated use `dev` or `build` option instead.
   */
  enabled?: boolean

  /**
   * Directory for build inspector UI output
   * Only work in build mode
   *
   * @default '.vite-inspect'
   */
  outputDir?: string

  /**
   * Filter for modules to be inspected
   */
  include?: FilterPattern

  /**
   * Filter for modules to not be inspected
   */
  exclude?: FilterPattern
}

type HookHandler<T> = T extends ObjectHook<infer F> ? F : T
type HookWrapper<K extends keyof Plugin> = (
  fn: NonNullable<HookHandler<Plugin[K]>>,
  context: ThisParameterType<NonNullable<HookHandler<Plugin[K]>>>,
  args: NonNullable<Parameters<HookHandler<Plugin[K]>>>,
  order: string
) => ReturnType<HookHandler<Plugin[K]>>

export default function PluginInspect(options: Options = {}): Plugin {
  const {
    dev = true,
    build = false,
    outputDir = '.vite-inspect',
  } = options

  if (!dev && !build) {
    return {
      name: 'vite-plugin-inspect',
    }
  }

  const filter = createFilter(options.include, options.exclude)

  let config: ResolvedConfig

  type TransformMap = Record<string, TransformInfo[]>

  const transformMap: TransformMap = {}
  const transformMapSSR: TransformMap = {}
  const idMap: Record<string, string> = {}
  const idMapSSR: Record<string, string> = {}

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
      const ssr = args[2]?.ssr

      const start = Date.now()
      const _result = await fn.apply(context, args)
      const end = Date.now()

      const result = typeof _result === 'string' ? _result : _result?.code

      const map = ssr ? transformMapSSR : transformMap
      if (filter(id) && result != null) {
        // initial tranform (load from fs), add a dummy
        if (!map[id])
          map[id] = [{ name: dummyLoadPluginName, result: code, start, end: start }]
        // record transform
        map[id].push({ name: plugin.name, result, start, end, order })
      }

      return _result
    })

    hijackHook(plugin, 'load', async (fn, context, args) => {
      const id = args[0]
      const ssr = args[1]?.ssr

      const start = Date.now()
      const _result = await fn.apply(context, args)
      const end = Date.now()

      const result = typeof _result === 'string' ? _result : _result?.code

      const map = ssr ? transformMapSSR : transformMap
      if (filter(id) && result != null)
        map[id] = [{ name: plugin.name, result, start, end }]

      return _result
    })

    hijackHook(plugin, 'resolveId', async (fn, context, args) => {
      const id = args[0]
      const ssr = args[2]?.ssr

      const _result = await fn.apply(context, args)

      const result = typeof _result === 'object' ? _result?.id : _result

      const map = ssr ? idMapSSR : idMap
      if (!id.startsWith('./') && result && result !== id)
        map[id] = result

      return _result
    })
  }

  function resolveId(id = '', ssr = false): string {
    if (id.startsWith('./'))
      id = resolve(config.root, id).replace(/\\/g, '/')
    return resolveIdRec(id, ssr)
  }

  function resolveIdRec(id: string, ssr = false): string {
    const map = ssr ? idMapSSR : idMap
    return map[id]
      ? resolveIdRec(map[id], ssr)
      : id
  }

  function getPluginMetrics(ssr = false) {
    const map: Record<string, PluginMetricInfo> = {}

    config.plugins.forEach((i) => {
      map[i.name] = {
        name: i.name,
        enforce: i.enforce,
        invokeCount: 0,
        totalTime: 0,
      }
    })

    Object.values(ssr ? transformMapSSR : transformMap)
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
      if (mod?.id) {
        delete transformMap[mod.id]
        delete transformMapSSR[mod.id]
      }
      return _invalidateModule.apply(this, args)
    }

    server.middlewares.use('/__inspect', sirv(DIR_CLIENT, {
      single: true,
      dev: true,
    }))

    createRPCServer<RPCFunctions>('vite-plugin-inspect', server.ws, {
      list,
      getIdInfo,
      getPluginMetrics,
      resolveId,
      clear: clearId,
    })

    async function getIdInfo(id: string, ssr = false, clear = false) {
      if (clear) {
        clearId(id, ssr)
        try {
          await server.transformRequest(id, { ssr })
        }
        catch {}
      }
      const resolvedId = resolveId(id, ssr)
      const map = ssr ? transformMapSSR : transformMap
      return {
        resolvedId,
        transforms: map[resolvedId] || [],
      }
    }

    function getModulesInfo(map: TransformMap) {
      return Object.keys(map).sort()
        .map((id): ModuleInfo => {
          const plugins = map[id]?.map(i => i.name)
          const deps = Array.from(server.moduleGraph.getModuleById(id)?.importedModules || [])
            .map(i => i.id || '')
            .filter(Boolean)
          return {
            id,
            plugins,
            deps,
            virtual: plugins[0] !== dummyLoadPluginName,
          }
        })
    }

    function list() {
      return {
        root: config.root,
        modules: getModulesInfo(transformMap),
        ssrModules: getModulesInfo(transformMapSSR),
      }
    }

    function clearId(_id: string, ssr = false) {
      const id = resolveId(_id)
      if (id) {
        const mod = server.moduleGraph.getModuleById(id)
        if (mod)
          server.moduleGraph.invalidateModule(mod)
        const map = ssr ? transformMapSSR : transformMap
        delete map[id]
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

  async function generateBuild() {
    // outputs data to `node_modules/.vite/inspect folder
    const targetDir = join(config.root, outputDir)
    const reportsDir = join(targetDir, 'reports')

    await fs.mkdir(targetDir, { recursive: true })

    await fs.copy(DIR_CLIENT, targetDir, { overwrite: true })

    await fs.writeFile(
      join(targetDir, 'index.html'),
      (await fs.readFile(join(targetDir, 'index.html'), 'utf-8'))
        .replace(
          'data-vite-inspect-mode="DEV"',
          'data-vite-inspect-mode="BUILD"',
        ),
    )

    await fs.rm(reportsDir, {
      recursive: true,
      force: true,
    })

    await fs.mkdir(reportsDir, { recursive: true })

    function getModulesInfo(map: TransformMap) {
      return Object.keys(map).sort()
        .map((id): ModuleInfo => {
          const plugins = map[id]?.map(i => i.name)
          return {
            id,
            deps: [],
            plugins,
            virtual: plugins[0] !== dummyLoadPluginName && map[id][0].name !== 'vite:load-fallback',
          }
        })
    }

    function list() {
      return {
        root: config.root,
        modules: getModulesInfo(transformMap),
        ssrModules: getModulesInfo(transformMapSSR),
      }
    }

    await fs.writeFile(
      join(reportsDir, 'list.json'),
      JSON.stringify(list(), null, 2),
      'utf-8',
    )

    await fs.writeFile(
      join(reportsDir, 'metrics.json'),
      JSON.stringify(getPluginMetrics(false), null, 2),
      'utf-8',
    )

    await fs.writeFile(
      join(reportsDir, 'metrics-ssr.json'),
      JSON.stringify(getPluginMetrics(true), null, 2),
      'utf-8',
    )

    async function dumpModuleInfo(dir: string, map: TransformMap, ssr = false) {
      await fs.ensureDir(dir)
      return Promise.all(Object.entries(map)
        .map(([id, info]) => fs.writeJSON(
          join(dir, `${hash(id)}.json`),
          <ModuleTransformInfo>{
            resolvedId: resolveId(id, ssr),
            transforms: info,
          }),
        ),
      )
    }

    await dumpModuleInfo(join(reportsDir, 'transform'), transformMap)
    await dumpModuleInfo(join(reportsDir, 'transform-ssr'), transformMapSSR, true)

    return targetDir
  }

  return <Plugin>{
    name: 'vite-plugin-inspect',
    enforce: 'pre',
    apply(_, { command }) {
      if (command === 'serve' && dev)
        return true
      if (command === 'build' && build)
        return true
      return false
    },
    configResolved(_config) {
      config = _config
      config.plugins.forEach(hijackPlugin)
    },
    configureServer,
    load: {
      order: 'pre',
      handler(id, { ssr } = {}) {
        const map = ssr ? transformMapSSR : transformMap
        delete map[id]
        return null
      },
    },
    handleHotUpdate({ modules, server }) {
      const ids = modules.map(module => module.id)
      server.ws.send({
        type: 'custom',
        event: 'vite-plugin-inspect:update',
        data: { ids } as HMRData,
      })
    },
    async buildEnd() {
      if (!build)
        return
      const dir = await generateBuild()
      // eslint-disable-next-line no-console
      console.log(green('Inspect report generated at'), dim(`${dir}`))
    },
  }
}
