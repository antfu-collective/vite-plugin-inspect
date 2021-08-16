import { resolve } from 'path'
import fs from 'fs'
import _debug from 'debug'
import type { ModuleNode, Plugin, ResolvedConfig } from 'vite'
import sirv from 'sirv'
import { parseURL } from 'ufo'
import { parseQuery } from 'vue-router'

const debug = _debug('vite-plugin-inspect')

function VitePluginPackageConfig(): Plugin {
  let config: ResolvedConfig
  const transformMap: Record<string, {name: string; result: string; start: number; end: number}[]> = {}
  const idMap: Record<string, string> = {}

  function hijackPlugin(plugin: Plugin) {
    if (plugin.transform) {
      debug('hijack plugin transform', plugin.name)
      const _transform = plugin.transform
      plugin.transform = async function(this: any, ...args: any[]) {
        const code = args[0]
        const id = args[1]
        const start = Date.now()
        const _result = await _transform.apply(this, args as any)
        const end = Date.now()

        const result = typeof _result === 'string' ? _result : _result?.code

        if (result != null) {
          if (!transformMap[id])
            transformMap[id] = [{ name: '__load__', result: code, start, end: start }]
          transformMap[id].push({ name: plugin.name, result, start, end })
        }

        return _result
      }
    }

    if (plugin.load) {
      debug('hijack plugin load', plugin.name)
      const _load = plugin.load
      plugin.load = async function(this: any, ...args: any[]) {
        const id = args[0]
        const start = Date.now()
        const _result = await _load.apply(this, args as any)
        const end = Date.now()

        const result = typeof _result === 'string' ? _result : _result?.code

        if (result != null)
          transformMap[id] = [{ name: plugin.name, result, start, end }]

        return _result
      }
    }

    if (plugin.resolveId) {
      debug('hijack plugin resolveId', plugin.name)
      const _resolveId = plugin.resolveId
      plugin.resolveId = async function(this: any, ...args: any[]) {
        const id = args[0]
        const _result = await _resolveId.apply(this, args as any)

        const result = typeof _result === 'object' ? _result?.id : _result

        if (!id.startsWith('./') && result && result !== id)
          idMap[id] = result

        return _result
      }
    }
  }

  function resolveId(id: string): string {
    return idMap[id] ? resolveId(idMap[id]) : id
  }

  function getIdInfo(id: string) {
    const resolvedId = resolveId(id)

    return {
      resolveId,
      transforms: transformMap[resolvedId] || [],
    }
  }

  return <Plugin>{
    name: 'vite-plugin-inspect',
    apply: 'serve',
    configResolved(_config) {
      config = _config
      config.plugins.forEach(hijackPlugin)
    },
    configureServer(server) {
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
            .map(id => ({ id, virtual: !fs.existsSync(id) }))

          res.write(JSON.stringify({
            root: config.root,
            modules,
          }, null, 2))
          res.end()
        }
        if (pathname === '/id') {
          const id = parseQuery(search).id as string
          res.write(JSON.stringify(getIdInfo(id), null, 2))
          res.end()
        }
      })
    },
  }
}

export default VitePluginPackageConfig
