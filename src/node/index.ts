import { join, resolve } from 'node:path'
import fs from 'fs-extra'
import _debug from 'debug'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import type { ObjectHook } from 'rollup'
import sirv from 'sirv'
import type { FilterPattern } from '@rollup/pluginutils'
import { createFilter } from '@rollup/pluginutils'
import { createRPCServer } from 'vite-dev-rpc'
import { hash } from 'ohash'
import c from 'picocolors'
import type { HMRData, ModuleInfo, ModuleTransformInfo, PluginMetricInfo, RPCFunctions, ResolveIdInfo, TransformInfo } from '../types'
import { DIR_CLIENT } from '../dir'

const debug = _debug('vite-plugin-inspect')
const NAME = 'vite-plugin-inspect'

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

  /**
   * Base URL for inspector UI
   *
   * @default read from Vite's config
   */
  base?: string
}

type HookHandler<T> = T extends ObjectHook<infer F> ? F : T
type HookWrapper<K extends keyof Plugin> = (
  fn: NonNullable<HookHandler<Plugin[K]>>,
  context: ThisParameterType<NonNullable<HookHandler<Plugin[K]>>>,
  args: NonNullable<Parameters<HookHandler<Plugin[K]>>>,
  order: string
) => ReturnType<HookHandler<Plugin[K]>>

export interface ViteInspectAPI {
  rpc: RPCFunctions
}

export default function PluginInspect(options: Options = {}): Plugin {
  const {
    dev = true,
    build = false,
    outputDir = '.vite-inspect',
  } = options

  if (!dev && !build) {
    return {
      name: NAME,
    }
  }

  const filter = createFilter(options.include, options.exclude)

  let config: ResolvedConfig

  type TransformMap = Record<string, TransformInfo[]>
  type ResolveIdMap = Record<string, ResolveIdInfo[]>

  const transformMap: TransformMap = {}
  const transformMapSSR: TransformMap = {}
  const idMap: ResolveIdMap = {}
  const idMapSSR: ResolveIdMap = {}

  function transformIdMap(idMap: ResolveIdMap) {
    return Object.values(idMap).reduce((map, ids) => {
      ids.forEach((id) => {
        map[id.result] ??= []
        map[id.result].push(id)
      })

      return map
    }, {} as TransformMap)
  }

  function getModulesInfo(transformMap: TransformMap, idMap: ResolveIdMap, getDeps: ((id: string) => string[]) | null, isVirtual: (pluginName: string, transformName: string) => boolean) {
    const transformedIdMap = transformIdMap(idMap)
    const ids = new Set(Object.keys(transformMap).concat(Object.keys(transformedIdMap)))

    return Array.from(ids).sort()
      .map((id): ModuleInfo => {
        const plugins = (transformMap[id] || []).map((transItem) => {
          return { name: transItem.name, transform: transItem.end - transItem.start }
        }).concat(
          // @ts-expect-error transform is optional
          (transformedIdMap[id] || []).map((idItem) => {
            return { name: idItem.name, resolveId: idItem.end - idItem.start }
          }),
        )

        return {
          id,
          deps: getDeps ? getDeps(id) : [],
          plugins,
          virtual: isVirtual(plugins[0].name, transformMap[id]?.[0].name || ''),
        }
      })
  }

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
      hook.handler = function (this: any, ...args: any) {
        return wrapper(oldFn, this, args, order)
      }
    }
    else if ('transform' in hook) {
      // transformIndexHTML
      const oldFn = hook.transform
      order += `-${hook.order || hook.enforce || 'normal'}`
      hook.transform = function (this: any, ...args: any) {
        return wrapper(oldFn, this, args, order)
      }
    }
    else {
      // vite hook
      const oldFn = hook
      plugin[name] = function (this: any, ...args: any) {
        return wrapper(oldFn, this, args, order)
      }
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

      const start = Date.now()
      const _result = await fn.apply(context, args)
      const end = Date.now()

      const result = typeof _result === 'object' ? _result?.id : _result

      const map = ssr ? idMapSSR : idMap
      if (result && result !== id) {
        if (!map[id])
          map[id] = []
        map[id].push({ name: plugin.name, result, start, end })
      }

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
    return map[id]?.[0]
      ? resolveIdRec(map[id][0].result, ssr)
      : id
  }

  function getPluginMetrics(ssr = false) {
    const map: Record<string, PluginMetricInfo> = {}
    const defaultMetricInfo = (): Pick<PluginMetricInfo, 'transform' | 'resolveId'> => ({
      transform: { invokeCount: 0, totalTime: 0 },
      resolveId: { invokeCount: 0, totalTime: 0 },
    })

    config.plugins.forEach((i) => {
      map[i.name] = {
        ...defaultMetricInfo(),
        name: i.name,
        enforce: i.enforce,
      }
    })

    Object.values(ssr ? transformMapSSR : transformMap)
      .forEach((transformInfos) => {
        transformInfos.forEach(({ name, start, end }) => {
          if (name === dummyLoadPluginName)
            return
          if (!map[name])
            map[name] = { ...defaultMetricInfo(), name }
          map[name].transform.totalTime += end - start
          map[name].transform.invokeCount += 1
        })
      })

    Object.values(ssr ? idMapSSR : idMap)
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

  function configureServer(server: ViteDevServer): RPCFunctions {
    const _invalidateModule = server.moduleGraph.invalidateModule
    server.moduleGraph.invalidateModule = function (...args) {
      const mod = args[0]
      if (mod?.id) {
        delete transformMap[mod.id]
        delete transformMapSSR[mod.id]
      }
      return _invalidateModule.apply(this, args)
    }

    const base = (options.base ?? server.config.base) || '/'

    server.middlewares.use(`${base}__inspect`, sirv(DIR_CLIENT, {
      single: true,
      dev: true,
    }))

    const rpcFunctions = {
      list,
      getIdInfo,
      getPluginMetrics,
      resolveId,
      clear: clearId,
    }

    createRPCServer<RPCFunctions>('vite-plugin-inspect', server.ws, rpcFunctions)

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

    const isVirtual = (pluginName: string) => pluginName !== dummyLoadPluginName
    const getDeps = (id: string) => Array.from(server.moduleGraph.getModuleById(id)?.importedModules || [])
      .map(i => i.id || '')
      .filter(Boolean)
    function list() {
      return {
        root: config.root,
        modules: getModulesInfo(transformMap, idMap, getDeps, isVirtual),
        ssrModules: getModulesInfo(transformMapSSR, idMapSSR, getDeps, isVirtual),
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
      const colorUrl = (url: string) => c.green(url.replace(/:(\d+)\//, (_, port) => `:${c.bold(port)}/`))

      let host = `${config.server.https ? 'https' : 'http'}://localhost:${config.server.port || '80'}`

      const url = server.resolvedUrls?.local[0]

      if (url) {
        try {
          const u = new URL(url)
          host = `${u.protocol}//${u.host}`
        }
        catch (error) {
          console.warn('Parse resolved url failed:', error)
        }
      }

      _print()
      // eslint-disable-next-line no-console
      console.log(`  ${c.green('➜')}  ${c.bold('Inspect')}: ${colorUrl(`${host}${base}__inspect/`)}`)
    }

    return rpcFunctions
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

    const isVirtual = (pluginName: string, transformName: string) => pluginName !== dummyLoadPluginName && transformName !== 'vite:load-fallback'

    function list() {
      return {
        root: config.root,
        modules: getModulesInfo(transformMap, idMap, null, isVirtual),
        ssrModules: getModulesInfo(transformMapSSR, idMap, null, isVirtual),
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

  const plugin = <Plugin>{
    name: NAME,
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

      const _createResolver = config.createResolver
      // @ts-expect-error mutate readonly
      config.createResolver = function (this: any, ...args: any) {
        const _resolver = _createResolver.apply(this, args)

        return async function (this: any, ...args: any) {
          const id = args[0]
          const aliasOnly = args[2]
          const ssr = args[3]

          const start = Date.now()
          const result = await _resolver.apply(this, args)
          const end = Date.now()

          const map = ssr ? idMapSSR : idMap
          if (result && result !== id) {
            const pluginName = aliasOnly ? 'alias' : 'vite:resolve (+alias)'
            if (!map[id])
              map[id] = []
            map[id].push({ name: pluginName, result, start, end })
          }

          return result
        }
      }
    },
    configureServer(server) {
      const rpc = configureServer(server)
      plugin.api = {
        rpc,
      }
    },
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
      console.log(c.green('Inspect report generated at'), c.dim(`${dir}`))
    },
  }

  return plugin
}

PluginInspect.getViteInspectAPI = function (plugins: Plugin[]): ViteInspectAPI | undefined {
  return plugins.find(p => p.name === NAME)?.api
}
