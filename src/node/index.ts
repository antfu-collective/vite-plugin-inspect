import process from 'node:process'
import type { Connect, Plugin, ViteDevServer } from 'vite'
import sirv from 'sirv'
import { createRPCServer } from 'vite-dev-rpc'
import c from 'picocolors'
import { debounce } from 'perfect-debounce'
import { DIR_CLIENT } from '../dir'
import type { HMRData, RpcFunctions } from '../types'
import type { ViteInspectOptions } from './options'
import { hijackPlugin } from './hijack'
import { generateBuild } from './build'
import { openBrowser } from './utils'
import { createPreviewServer } from './preview'
import type { InspectContextVite } from './context'
import { InspectContext } from './context'
import { createServerRpc } from './rpc'

export * from './options'

const NAME = 'vite-plugin-inspect'
const isCI = !!process.env.CI

export interface ViteInspectAPI {
  rpc: RpcFunctions
}

export default function PluginInspect(options: ViteInspectOptions = {}): Plugin {
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

  const ctx = new InspectContext(options)

  const timestampRE = /\bt=\d{13}&?\b/
  const trailingSeparatorRE = /[?&]$/

  // a hack for wrapping connect server stack
  // see https://github.com/senchalabs/connect/blob/0a71c6b139b4c0b7d34c0f3fca32490595ecfd60/index.js#L50-L55
  function setupMiddlewarePerf(
    ctx: InspectContextVite,
    middlewares: Connect.Server['stack'],
  ) {
    let firstMiddlewareIndex = -1
    middlewares.forEach((middleware, index) => {
      const { handle: originalHandle } = middleware
      if (typeof originalHandle !== 'function' || !originalHandle.name)
        return middleware

      middleware.handle = function (...middlewareArgs: any[]) {
        let req: any
        if (middlewareArgs.length === 4)
          [, req] = middlewareArgs
        else
          [req] = middlewareArgs

        const start = Date.now()
        const url = req.url?.replace(timestampRE, '').replace(trailingSeparatorRE, '')
        ctx.data.serverMetrics.middleware![url] ??= []

        if (firstMiddlewareIndex < 0)
          firstMiddlewareIndex = index

        // clear middleware timing
        if (index === firstMiddlewareIndex)
          ctx.data.serverMetrics.middleware![url] = []

        // @ts-expect-error handle needs 3 or 4 arguments
        const result = originalHandle.apply(this, middlewareArgs)

        Promise.resolve(result)
          .then(() => {
            const total = Date.now() - start
            const metrics = ctx.data.serverMetrics.middleware![url]

            // middleware selfTime = totalTime - next.totalTime
            ctx.data.serverMetrics.middleware![url].push({
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

  function configureServer(server: ViteDevServer): RpcFunctions {
    const config = server.config
    Object.values(server.environments)
      .forEach((env) => {
        const envCtx = ctx.getEnvContext(env)
        const _invalidateModule = env.moduleGraph.invalidateModule
        env.moduleGraph.invalidateModule = function (...args) {
          const mod = args[0]
          if (mod?.id)
            envCtx.invalidate(mod.id)
          return _invalidateModule.apply(this, args)
        }
      })

    const base = (options.base ?? server.config.base) || '/'

    server.middlewares.use(`${base}__inspect`, sirv(DIR_CLIENT, {
      single: true,
      dev: true,
    }))

    const rpc = createServerRpc(ctx)

    const rpcServer = createRPCServer<RpcFunctions>(
      'vite-plugin-inspect',
      server.ws,
      rpc,
    )

    const debouncedModuleUpdated = debounce(() => {
      rpcServer.onModuleUpdated.asEvent()
    }, 100)

    server.middlewares.use((req, res, next) => {
      debouncedModuleUpdated()
      next()
    })

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

    return rpc
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
    configResolved(config) {
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
            const vite = ctx.getViteContext(config)
            const env = vite.getEnvContext(ssr ? 'ssr' : 'client')
            env.recordResolveId(id, { name: pluginName, result, start, end })
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
        setupMiddlewarePerf(
          ctx.getViteContext(server.config),
          server.middlewares.stack,
        )
      }
    },
    load: {
      order: 'pre',
      handler(id) {
        ctx.getEnvContext(this.environment)
          .invalidate(id)
        return null
      },
    },
    hotUpdate({ modules, environment }) {
      const ids = modules.map(module => module.id)
      environment.hot.send({
        type: 'custom',
        event: 'vite-plugin-inspect:update',
        data: { ids } as HMRData,
      })
    },
    async buildEnd() {
      if (!build)
        return
      const dir = await generateBuild(ctx)
      // eslint-disable-next-line no-console
      console.log(c.green('Inspect report generated at'), c.dim(`${dir}`))
      if (_open && !isCI)
        createPreviewServer(dir)
    },
  }
  return plugin
}
