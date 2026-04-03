import type { Connect, Plugin, Rollup, ViteDevServer } from 'vite'
import type { HMRData } from '../types'
import type { InspectContextVite } from './context'
import type { ViteInspectOptions } from './options'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import c from 'ansis'
import { getPackageInfo } from 'local-pkg'
import { debounce } from 'perfect-debounce'
import sirv from 'sirv'
import { DIR_CLIENT } from '../dirs'
import { createBuildGenerator, createEnvOrderHooks } from './build'
import { InspectContext } from './context'
import { hijackPlugin } from './hijack'
import { rpcFunctions, setInspectContext } from './rpc'

export * from './options'

const NAME = 'vite-plugin-inspect'

export default function PluginInspect(options: ViteInspectOptions = {}): Plugin {
  const {
    dev = true,
    build = false,
  } = options

  if (!dev && !build) {
    return {
      name: NAME,
    }
  }

  const ctx = new InspectContext(options)
  let onBuildEnd: (envName: string, pluginCtx: Rollup.PluginContext) => Promise<void> | undefined

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
              self: metrics.length ? Math.max(total - (metrics.at(-1)?.total || 0), 0) : total,
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

  function configureServer(server: ViteDevServer) {
    Object.values(server.environments)
      .forEach((env) => {
        const envCtx = ctx.getEnvContext(env)!
        const _invalidateModule = env.moduleGraph.invalidateModule
        env.moduleGraph.invalidateModule = function (...args) {
          const mod = args[0]
          if (mod?.id)
            envCtx.invalidate(mod.id)
          return _invalidateModule.apply(this, args)
        }
      })

    const base = (options.base ?? server.config.base) || '/'

    // Redirect legacy /__inspect URL to new /.vite-inspect
    server.middlewares.use(`${base}__inspect`, (req, res) => {
      const newUrl = req.url?.replace(/^\/?/, `${base}.vite-inspect/`) ?? `${base}.vite-inspect/`
      res.writeHead(302, { Location: newUrl })
      res.end()
    })

    const clientEntryPointPromise = getPackageInfo('@vitejs/devtools').then(async (pkg) => {
      const clientFile = await readFile(resolve(DIR_CLIENT, 'index.html'), { encoding: 'utf8' })
      return clientFile.replace(
        'vite-plugin-inspect-devtools-injector.js',
        `/@fs/${resolve(pkg!.rootPath, 'dist/client/inject.js').replace(/\\/g, '/')}`,
      )
    })

    server.middlewares.use(`${base}.vite-inspect`, async (req, res, next) => {
      const url = req.url
      if (url === '' || url === '/') {
        res.writeHead(200, { 'content-type': 'text/html' })
        return res.end(await clientEntryPointPromise)
      }

      next()
    })

    server.middlewares.use(`${base}.vite-inspect`, sirv(DIR_CLIENT, {
      single: true,
      dev: true,
    }))
  }

  function setupDevTools(ctx: InspectContext, base: string) {
    return {
      capabilities: {
        dev: true,
        build: true,
      },
      async setup(devtoolsCtx: any) {
        // Bind InspectContext to this DevTools context
        setInspectContext(devtoolsCtx, ctx)

        // Register RPC functions
        for (const fn of rpcFunctions) {
          devtoolsCtx.rpc.register(fn)
        }

        // Register dock entry
        if (devtoolsCtx.docks) {
          devtoolsCtx.docks.register({
            id: 'vite-plugin-inspect',
            title: 'Inspect',
            icon: 'ph:magnifying-glass-duotone',
            type: 'iframe',
            url: `${base}.vite-inspect/`,
          })
        }

        // Host static client UI for build output
        devtoolsCtx.views.hostStatic(`${base}.vite-inspect/`, DIR_CLIENT)

        // Setup module update broadcast (dev mode only)
        if (devtoolsCtx.viteServer) {
          const debouncedBroadcast = debounce(() => {
            devtoolsCtx.rpc.broadcast({
              method: 'vite-plugin-inspect:on-module-updated',
              args: [],
            })
          }, 100)

          devtoolsCtx.viteServer.middlewares.use((req: any, res: any, next: any) => {
            debouncedBroadcast()
            next()
          })
        }
      },
    }
  }

  const plugin = <Plugin>{
    name: NAME,
    enforce: 'pre',
    devtools: setupDevTools(ctx, options.base || '/'),
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

      if (build) {
        const buildGenerator = createBuildGenerator(ctx)
        onBuildEnd = createEnvOrderHooks<[pluginCtx: Rollup.PluginContext]>(Object.keys(config.environments), {
          async onFirst() {
            await buildGenerator.setupOutputDir()
          },
          async onEach(pluginCtx) {
            await buildGenerator.generateForEnv(pluginCtx)
          },
          async onLast(pluginCtx) {
            await buildGenerator.generateMetadata()

            const dir = buildGenerator.getOutputDir()
            pluginCtx.environment.logger.info(`${c.green('Inspect report generated at')}  ${c.dim(dir)}`)
          },
        })
      }
    },
    configureServer(server) {
      configureServer(server)

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
          ?.invalidate(id)
        return null
      },
    },
    hotUpdate({ modules }) {
      const ids = modules.map(module => module.id)
      this.environment.hot.send({
        type: 'custom',
        event: 'vite-plugin-inspect:update',
        data: { ids } as HMRData,
      })
    },
    async buildEnd() {
      onBuildEnd?.(this.environment.name, this)
    },
    sharedDuringBuild: true,
  }
  return plugin
}
