import { resolve } from 'path'
import _debug from 'debug'
import { yellow } from 'chalk'
import type { ModuleNode, Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import sirv from 'sirv'
import { parseURL } from 'ufo'
import { parseQuery } from 'vue-router'
import { createFilter, FilterPattern } from '@rollup/pluginutils'
import { ModuleInfo, TransformInfo } from '../types'

const debug = _debug('vite-plugin-inspect')

const isWindows = process.platform === 'win32'
const windowsRe = /^([A-Z]+):\/(.*)/
const WindowResolveIdPrefix = '/__resolve_windows/'

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

function PluginInspect(options: Options = {}): Plugin {
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
  const windowsIdMap: Record<string, string> = {}

  function hijackPlugin(plugin: Plugin) {
    if (plugin.transform) {
      debug('hijack plugin transform', plugin.name)
      const _transform = plugin.transform
      plugin.transform = async function(this: any, ...args: any[]) {
        const code = args[0]
        let id = args[0]
        let _result
        const start = Date.now()
        if (isWindows && id && id.startsWith(WindowResolveIdPrefix)) {
          id = windowsIdMap[id]
          args = new Array<any>(...args.splice(1))
          args.unshift(id)
          _result = await _transform.apply(this, args as any)
        }
        else {
          _result = await _transform.apply(this, args as any)
        }
        const end = Date.now()

        const result = typeof _result === 'string' ? _result : _result?.code

        if (filter(id) && result != null) {
          // the last plugin must be `vite:import-analysis`, if it's already there, we reset the stack
          if (transformMap[id] && transformMap[id].slice(-1)[0]?.name === 'vite:import-analysis')
            delete transformMap[id]
          // initial tranform (load from fs), add a dummy
          if (!transformMap[id])
            transformMap[id] = [{ name: '__load__', result: code, start, end: start }]
          // record transform
          transformMap[id].push({ name: plugin.name, result, start, end })
        }

        return _result
      }
    }

    if (plugin.load) {
      debug('hijack plugin load', plugin.name)
      const _load = plugin.load
      plugin.load = async function(this: any, ...args: any[]) {
        let id = args[0]
        let _result
        const start = Date.now()
        if (isWindows && id && id.startsWith(WindowResolveIdPrefix)) {
          id = windowsIdMap[id]
          args = new Array<any>(...args.splice(1))
          args.unshift(id)
          _result = await _load.apply(this, args as any)
        }
        else {
          _result = await _load.apply(this, args as any)
        }
        const end = Date.now()

        const result = typeof _result === 'string' ? _result : _result?.code

        if (filter(id) && result != null)
          transformMap[id] = [{ name: plugin.name, result, start, end }]

        return _result
      }
    }

    if (plugin.resolveId) {
      debug('hijack plugin resolveId', plugin.name)
      const _resolveId = plugin.resolveId
      plugin.resolveId = async function(this: any, ...args: any[]) {
        let id = args[0]
        let _result
        if (isWindows && id && id.startsWith(WindowResolveIdPrefix)) {
          id = windowsIdMap[id]
          args = new Array<any>(...args.splice(1))
          args.unshift(id)
          _result = await _resolveId.apply(this, args as any)
        }
        else {
          _result = await _resolveId.apply(this, args as any)
        }

        const result = typeof _result === 'object' ? _result?.id : _result

        if (!id.startsWith('./') && result && result !== id)
          idMap[id] = result

        return _result
      }
    }
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

  function configureServer(server: ViteDevServer) {
    const _invalidateModule = server.moduleGraph.invalidateModule
    server.moduleGraph.invalidateModule = function(this: any, ...args: any) {
      const mod = args[0] as ModuleNode
      if (mod?.id)
        delete transformMap[mod.id]
      return _invalidateModule.apply(this, args)
    }

    if (process.env.NODE_ENV === 'production') {
      server.middlewares.use('/__inspect', sirv(resolve(__dirname, 'client'), {
        single: true,
        dev: true,
      }))
    }

    server.middlewares.use('/__inspect_api', (req, res) => {
      const { pathname, search } = parseURL(req.url)

      if (pathname === '/list') {
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

        res.write(JSON.stringify({
          root: config.root,
          modules,
        }, null, 2))
        res.end()
      }
      else if (pathname === '/module') {
        const id = parseQuery(search).id as string
        res.write(JSON.stringify(getIdInfo(id), null, 2))
        res.end()
      }
      else if (pathname === '/resolve') {
        let id = resolveId(parseQuery(search).id as string)
        if (isWindows) {
          const match = id.match(windowsRe)
          if (match) {
            const original = id
            id = `${WindowResolveIdPrefix}${match[1]}/${match[2]}`
            windowsIdMap[id] = original
          }
        }
        res.write(JSON.stringify({ id }, null, 2))
        res.end()
      }
      else if (pathname === '/clear') {
        const id = resolveId(parseQuery(search).id as string)
        if (id) {
          const mod = server.moduleGraph.getModuleById(id)
          if (mod)
            server.moduleGraph.invalidateModule(mod)
          delete transformMap[id]
        }
        res.end()
      }
    })

    // hijack httpServer.listen to print the log
    const _listen = server.httpServer!.listen
    let port = config.server.port || 3000
    let timer: any
    server.httpServer!.listen = function(this: any, ...args: any) {
      port ||= args[0]
      clearTimeout(timer)
      timer = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log(`  > Inspect: ${yellow(`http://localhost:${port}/__inspect/`)}\n`)
      }, 0)
      return _listen.apply(this, args)
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

export default PluginInspect
