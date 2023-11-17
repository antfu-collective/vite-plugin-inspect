import process from 'node:process'
import type { Connect, Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import sirv from 'sirv'
import { createRPCServer } from 'vite-dev-rpc'
import c from 'picocolors'
import type { HMRData, RPCFunctions } from '../types'
import { DIR_CLIENT } from '../dir'
import type { Options } from './options'
import { ViteInspectContext } from './context'
import { hijackPlugin } from './hijack'
import { generateBuild } from './build'
import { openBrowser } from './utils'
import { createPreviewServer } from './preview'

export * from './options'

const NAME = 'vite-plugin-inspect'
const isCI = !!process.env.CI

export interface ViteInspectAPI {
  rpc: RPCFunctions
}

export default function PluginInspect(options: Options = {}): Plugin {
  const {
    dev = true,
    build = false,
    silent = false,
    open: _open = false,
  } = options

  if (!dev && !build) {
    return {
      name: NAME,
    }
  }

  const ctx = new ViteInspectContext(options)

  const timestampRE = /\bt=\d{13}&?\b/
  const trailingSeparatorRE = /[?&]$/

  let config: ResolvedConfig
  const serverPerf: {
    middleware?: Record<string, { name: string, total: number, self: number }[]>
  } = {
    middleware: {},
  }

  // a hack for wrapping connect server stack
  // see https://github.com/senchalabs/connect/blob/0a71c6b139b4c0b7d34c0f3fca32490595ecfd60/index.js#L50-L55
  function setupMiddlewarePerf(middlewares: Connect.Server['stack']) {
    let firstMiddlewareIndex = -1
    middlewares.forEach((middleware, index) => {
      const { handle: originalHandle } = middleware
      if (typeof originalHandle !== 'function' || !originalHandle.name)
        return middleware

      middleware.handle = (...middlewareArgs: any[]) => {
        let req: any
        if (middlewareArgs.length === 4)
          [, req] = middlewareArgs
        else
          [req] = middlewareArgs

        const start = Date.now()
        const url = req.url?.replace(timestampRE, '').replace(trailingSeparatorRE, '')
        serverPerf.middleware![url] ??= []

        if (firstMiddlewareIndex < 0)
          firstMiddlewareIndex = index

        // clear middleware timing
        if (index === firstMiddlewareIndex)
          serverPerf.middleware![url] = []

        // @ts-expect-error handle needs 3 or 4 arguments
        const result = originalHandle(...middlewareArgs)

        Promise.resolve(result)
          .then(() => {
            const total = Date.now() - start
            const metrics = serverPerf.middleware![url]

            // middleware selfTime = totalTime - next.totalTime
            serverPerf.middleware![url].push({
              self: metrics.length ? Math.max(total - metrics[metrics.length - 1].total, 0) : total,
              total,
              name: originalHandle.name,
            })
          })

        return result
      }

      Object.defineProperty(middleware.handle, 'name', {
        value: originalHandle.name,
        configurable: true,
        enumerable: true,
      })

      return middleware
    })
  }

  function configureServer(server: ViteDevServer): RPCFunctions {
    const _invalidateModule = server.moduleGraph.invalidateModule
    server.moduleGraph.invalidateModule = function (...args) {
      const mod = args[0]
      if (mod?.id) {
        ctx.recorderClient.invalidate(mod.id)
        ctx.recorderServer.invalidate(mod.id)
      }
      return _invalidateModule.apply(this, args)
    }

    const base = (options.base ?? server.config.base) || '/'

    server.middlewares.use(`${base}__inspect`, sirv(DIR_CLIENT, {
      single: true,
      dev: true,
    }))

    const rpcFunctions = {
      list: () => ctx.getList(server),
      getIdInfo,
      getPluginMetrics: (ssr = false) => ctx.getPluginMetrics(ssr),
      getServerMetrics,
      resolveId: (id: string, ssr = false) => ctx.resolveId(id, ssr),
      clear: clearId,
    }

    createRPCServer<RPCFunctions>('vite-plugin-inspect', server.ws, rpcFunctions)

    function getServerMetrics() {
      return serverPerf || {}
    }

    async function getIdInfo(id: string, ssr = false, clear = false) {
      if (clear) {
        clearId(id, ssr)
        try {
          await server.transformRequest(id, { ssr })
        }
        catch {}
      }
      const resolvedId = ctx.resolveId(id, ssr)
      const recorder = ctx.getRecorder(ssr)
      return {
        resolvedId,
        transforms: recorder.transform[resolvedId] || [],
      }
    }

    function clearId(_id: string, ssr = false) {
      const id = ctx.resolveId(_id)
      if (id) {
        const mod = server.moduleGraph.getModuleById(id)
        if (mod)
          server.moduleGraph.invalidateModule(mod)
        ctx.getRecorder(ssr).invalidate(id)
      }
    }

    const _print = server.printUrls
    server.printUrls = () => {
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

      if (!silent) {
        const colorUrl = (url: string) => c.green(url.replace(/:(\d+)\//, (_, port) => `:${c.bold(port)}/`))
        // eslint-disable-next-line no-console
        console.log(`  ${c.green('➜')}  ${c.bold('Inspect')}: ${colorUrl(`${host}${base}__inspect/`)}`)
      }

      if (_open && !isCI) {
        // a delay is added to ensure the app page is opened first
        setTimeout(() => {
          openBrowser(`${host}${base}__inspect/`)
        }, 500)
      }
    }

    return rpcFunctions
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
      config = ctx.config = _config
      config.plugins.forEach(plugin => hijackPlugin(plugin, ctx))
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

          if (result && result !== id) {
            const pluginName = aliasOnly ? 'alias' : 'vite:resolve (+alias)'
            ctx
              .getRecorder(ssr)
              .recordResolveId(id, { name: pluginName, result, start, end })
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

      return () => {
        setupMiddlewarePerf(server.middlewares.stack)
      }
    },
    load: {
      order: 'pre',
      handler(id, { ssr } = {}) {
        ctx.getRecorder(ssr).invalidate(id)
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
      const dir = await generateBuild(ctx, config)
      // eslint-disable-next-line no-console
      console.log(c.green('Inspect report generated at'), c.dim(`${dir}`))
      if (_open && !isCI)
        createPreviewServer(dir)
    },
  }
  return plugin
}

PluginInspect.getViteInspectAPI = function (plugins: Plugin[]): ViteInspectAPI | undefined {
  return plugins.find(p => p.name === NAME)?.api
}
