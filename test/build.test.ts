import type { RpcDumpRecord, RpcDumpStore } from 'devframe/rpc'
import type { StaticRpcDumpManifest, StaticRpcDumpManifestQueryEntry } from 'devframe/rpc/dump'
import fs from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DevTools } from '@vitejs/devtools'
import { DEVTOOLS_DIRNAME, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME } from '@vitejs/devtools-kit/constants'
import vue from '@vitejs/plugin-vue'
import { createClientFromDump } from 'devframe/rpc/dump'
import { structuredCloneParse } from 'devframe/utils/structured-clone'
import { build } from 'vite'
import Inspect from 'vite-plugin-inspect'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const playgroundDir = resolve(__dirname, '../playground')
const buildOutDir = resolve(playgroundDir, 'dist')
const devtoolsOutputDir = resolve(buildOutDir, DEVTOOLS_DIRNAME)

beforeAll(async () => {
  fs.rmSync(buildOutDir, { recursive: true, force: true })

  await build({
    configFile: false,
    root: playgroundDir,
    logLevel: 'silent',
    plugins: [
      DevTools({ build: { withApp: true } }),
      vue(),
      {
        name: 'custom-loader',
        resolveId(id) {
          return id === 'virtual:hi' ? `\0${id}` : undefined
        },
        load(id) {
          if (id === '\0virtual:hi')
            return 'export default \'Hi!\''
        },
      },
      {
        name: 'custom-slow-loader',
        enforce: 'post' as const,
        resolveId(id) {
          return id.startsWith('virtual:slow:') ? `\0${id}` : undefined
        },
        load(id) {
          if (!id.startsWith('\0virtual:slow:'))
            return
          const matcher = /^\0virtual:slow:(\d+)$/.exec(id)
          if (matcher)
            return `export default 'Hi after ${matcher[1]} seconds!'`
          return `export default 'Error: Invalid timeout'`
        },
      },
      Inspect({ build: true }),
    ],
    build: { write: true },
  })
}, 120_000)

afterAll(() => {
  fs.rmSync(buildOutDir, { recursive: true, force: true })
})

function readManifest(): StaticRpcDumpManifest {
  return JSON.parse(fs.readFileSync(resolve(devtoolsOutputDir, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME), 'utf-8'))
}

function readRecord(entry: StaticRpcDumpManifestQueryEntry, path: string): RpcDumpRecord {
  const text = fs.readFileSync(resolve(devtoolsOutputDir, path), 'utf-8')
  return entry.serialization === 'structured-clone' ? structuredCloneParse(text) : JSON.parse(text)
}

function readFirstRecord(name: string): RpcDumpRecord {
  const entry: StaticRpcDumpManifestQueryEntry = readManifest()[name]
  return readRecord(entry, Object.values(entry.records)[0])
}

describe('devtools RPC dump', () => {
  it('generates RPC dump manifest', () => {
    expect(fs.existsSync(resolve(devtoolsOutputDir, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME))).toBe(true)
    expect(readManifest()).toBeDefined()
  })

  it('manifest contains all vite-plugin-inspect RPC functions', () => {
    const manifest = readManifest()

    expect(manifest['vite-plugin-inspect:get-metadata']).toBeDefined()
    expect(manifest['vite-plugin-inspect:get-modules-list']).toBeDefined()
    expect(manifest['vite-plugin-inspect:get-plugin-metrics']).toBeDefined()
    expect(manifest['vite-plugin-inspect:get-module-transform-info']).toBeDefined()
    expect(manifest['vite-plugin-inspect:resolve-id']).toBeDefined()
    expect(manifest['vite-plugin-inspect:get-server-metrics']).toBeDefined()
  })

  it('metadata dump contains instances and plugins', () => {
    const { output } = readFirstRecord('vite-plugin-inspect:get-metadata')

    expect(output.instances).toBeDefined()
    expect(output.instances.length).toBeGreaterThan(0)
    expect(output.instances[0].plugins.length).toBeGreaterThan(0)
    expect(output.instances[0].environments.length).toBeGreaterThan(0)
  })

  it('modules list dump contains App.vue', () => {
    const { output } = readFirstRecord('vite-plugin-inspect:get-modules-list')

    expect(Array.isArray(output)).toBe(true)
    expect(output.length).toBeGreaterThan(0)

    const appModule = output.find((m: any) => m.id.includes('App.vue'))
    expect(appModule).toBeDefined()
    expect(appModule.plugins.length).toBeGreaterThan(0)
  })

  it('plugin metrics dump has transform and resolveId data', () => {
    const { output } = readFirstRecord('vite-plugin-inspect:get-plugin-metrics')

    expect(Array.isArray(output)).toBe(true)
    expect(output.length).toBeGreaterThan(0)
    expect(output[0]).toHaveProperty('name')
    expect(output[0]).toHaveProperty('transform')
    expect(output[0]).toHaveProperty('resolveId')
  })

  it('transform info dump has resolvedId and transforms', () => {
    expect(Object.keys(readManifest()['vite-plugin-inspect:get-module-transform-info'].records).length).toBeGreaterThan(0)

    const { output } = readFirstRecord('vite-plugin-inspect:get-module-transform-info')

    expect(output).toHaveProperty('resolvedId')
    expect(output).toHaveProperty('transforms')
    expect(Array.isArray(output.transforms)).toBe(true)
    expect(output.transforms.length).toBeGreaterThan(0)
  })

  it('dump can be consumed via createClientFromDump', async () => {
    const store: RpcDumpStore = {
      definitions: {},
      records: {},
    }

    for (const [name, entry] of Object.entries(readManifest())) {
      store.definitions[name] = { name, type: entry.type }

      if (entry.type === 'static' && entry.path) {
        store.records[`${name}---`] = readRecord(entry, entry.path)
      }
      else if (entry.type === 'query' && entry.records) {
        for (const [hash, path] of Object.entries(entry.records) as [string, string][])
          store.records[`${name}---${hash}`] = readRecord(entry, path)
        if (entry.fallback)
          store.records[`${name}---fallback`] = readRecord(entry, entry.fallback)
      }
    }

    const client = createClientFromDump(store)

    const metadata = await (client as any)['vite-plugin-inspect:get-metadata']()
    expect(metadata.instances).toBeDefined()
    expect(metadata.instances.length).toBeGreaterThan(0)
    expect(metadata.instances[0].plugins.length).toBeGreaterThan(0)
  })
})
