import type { RpcDumpStore } from 'devframe/rpc'
import fs from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DevTools } from '@vitejs/devtools'
import { DEVTOOLS_DIRNAME, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME } from '@vitejs/devtools-kit/constants'
import vue from '@vitejs/plugin-vue'
import { createClientFromDump } from 'devframe/rpc'
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

describe('devtools RPC dump', () => {
  it('generates RPC dump manifest', () => {
    const manifestPath = resolve(devtoolsOutputDir, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME)
    expect(fs.existsSync(manifestPath)).toBe(true)

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    expect(manifest).toBeDefined()
  })

  it('manifest contains all vite-plugin-inspect RPC functions', () => {
    const manifest = JSON.parse(
      fs.readFileSync(resolve(devtoolsOutputDir, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME), 'utf-8'),
    )

    expect(manifest['vite-plugin-inspect:get-metadata']).toBeDefined()
    expect(manifest['vite-plugin-inspect:get-modules-list']).toBeDefined()
    expect(manifest['vite-plugin-inspect:get-plugin-metrics']).toBeDefined()
    expect(manifest['vite-plugin-inspect:get-module-transform-info']).toBeDefined()
    expect(manifest['vite-plugin-inspect:resolve-id']).toBeDefined()
    expect(manifest['vite-plugin-inspect:get-server-metrics']).toBeDefined()
  })

  it('metadata dump contains instances and plugins', () => {
    const manifest = JSON.parse(
      fs.readFileSync(resolve(devtoolsOutputDir, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME), 'utf-8'),
    )

    const entry = manifest['vite-plugin-inspect:get-metadata']
    const recordPath = Object.values(entry.records)[0] as string
    const file = JSON.parse(fs.readFileSync(resolve(devtoolsOutputDir, recordPath), 'utf-8'))

    expect(file.data.output.instances).toBeDefined()
    expect(file.data.output.instances.length).toBeGreaterThan(0)
    expect(file.data.output.instances[0].plugins.length).toBeGreaterThan(0)
    expect(file.data.output.instances[0].environments.length).toBeGreaterThan(0)
  })

  it('modules list dump contains App.vue', () => {
    const manifest = JSON.parse(
      fs.readFileSync(resolve(devtoolsOutputDir, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME), 'utf-8'),
    )

    const entry = manifest['vite-plugin-inspect:get-modules-list']
    const firstRecordPath = Object.values(entry.records)[0] as string
    const file = JSON.parse(fs.readFileSync(resolve(devtoolsOutputDir, firstRecordPath), 'utf-8'))

    expect(Array.isArray(file.data.output)).toBe(true)
    expect(file.data.output.length).toBeGreaterThan(0)

    const appModule = file.data.output.find((m: any) => m.id.includes('App.vue'))
    expect(appModule).toBeDefined()
    expect(appModule.plugins.length).toBeGreaterThan(0)
  })

  it('plugin metrics dump has transform and resolveId data', () => {
    const manifest = JSON.parse(
      fs.readFileSync(resolve(devtoolsOutputDir, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME), 'utf-8'),
    )

    const entry = manifest['vite-plugin-inspect:get-plugin-metrics']
    const firstRecordPath = Object.values(entry.records)[0] as string
    const file = JSON.parse(fs.readFileSync(resolve(devtoolsOutputDir, firstRecordPath), 'utf-8'))

    expect(Array.isArray(file.data.output)).toBe(true)
    expect(file.data.output.length).toBeGreaterThan(0)
    expect(file.data.output[0]).toHaveProperty('name')
    expect(file.data.output[0]).toHaveProperty('transform')
    expect(file.data.output[0]).toHaveProperty('resolveId')
  })

  it('transform info dump has resolvedId and transforms', () => {
    const manifest = JSON.parse(
      fs.readFileSync(resolve(devtoolsOutputDir, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME), 'utf-8'),
    )

    const entry = manifest['vite-plugin-inspect:get-module-transform-info']
    expect(Object.keys(entry.records).length).toBeGreaterThan(0)

    const firstRecordPath = Object.values(entry.records)[0] as string
    const file = JSON.parse(fs.readFileSync(resolve(devtoolsOutputDir, firstRecordPath), 'utf-8'))

    expect(file.data.output).toHaveProperty('resolvedId')
    expect(file.data.output).toHaveProperty('transforms')
    expect(Array.isArray(file.data.output.transforms)).toBe(true)
    expect(file.data.output.transforms.length).toBeGreaterThan(0)
  })

  it('dump can be consumed via createClientFromDump', async () => {
    const manifest = JSON.parse(
      fs.readFileSync(resolve(devtoolsOutputDir, DEVTOOLS_RPC_DUMP_MANIFEST_FILENAME), 'utf-8'),
    )

    const store: RpcDumpStore = {
      definitions: {},
      records: {},
    }

    for (const [name, entry] of Object.entries(manifest) as [string, any][]) {
      store.definitions[name] = { name, type: entry.type }

      if (entry.type === 'static' && entry.path) {
        const file = JSON.parse(fs.readFileSync(resolve(devtoolsOutputDir, entry.path), 'utf-8'))
        store.records[`${name}---`] = file.data
      }
      else if (entry.type === 'query' && entry.records) {
        for (const [hash, path] of Object.entries(entry.records) as [string, string][]) {
          const file = JSON.parse(fs.readFileSync(resolve(devtoolsOutputDir, path), 'utf-8'))
          store.records[`${name}---${hash}`] = file.data
        }
        if (entry.fallback) {
          const file = JSON.parse(fs.readFileSync(resolve(devtoolsOutputDir, entry.fallback), 'utf-8'))
          store.records[`${name}---fallback`] = file.data
        }
      }
    }

    const client = createClientFromDump(store)

    const metadata = await (client as any)['vite-plugin-inspect:get-metadata']()
    expect(metadata.instances).toBeDefined()
    expect(metadata.instances.length).toBeGreaterThan(0)
    expect(metadata.instances[0].plugins.length).toBeGreaterThan(0)
  })
})
