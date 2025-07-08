import type { Rollup } from 'vite'
import type { ModuleTransformInfo } from '../types'
import type { InspectContext } from './context'
import fs from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import process from 'node:process'
import { hash } from 'ohash'
import { DIR_CLIENT } from '../dirs'

export interface EnvOrderHooks<Args extends readonly unknown[]> {
  onFirst?: (...args: Args) => Promise<void>
  onEach?: (...args: Args) => Promise<void>
  onLast?: (...args: Args) => Promise<void>
}
export function createEnvOrderHooks<Args extends readonly unknown[]>(
  environmentNames: string[],
  { onFirst, onEach, onLast }: EnvOrderHooks<Args>,
) {
  const remainingEnvs = new Set<string>(environmentNames)
  let ranFirst = false
  let ranLast = false

  return async (envName: string, ...args: Args) => {
    if (!ranFirst) {
      ranFirst = true
      await onFirst?.(...args)
    }

    remainingEnvs.delete(envName)
    await onEach?.(...args)

    if (!ranLast && remainingEnvs.size === 0) {
      ranLast = true
      await onLast?.(...args)
    }
  }
}

export function createBuildGenerator(ctx: InspectContext) {
  const {
    outputDir = '.vite-inspect',
  } = ctx.options

  // outputs data to `.vite-inspect` folder
  const targetDir = isAbsolute(outputDir)
    ? outputDir
    : resolve(process.cwd(), outputDir)
  const reportsDir = join(targetDir, 'reports')

  return {
    getOutputDir() {
      return targetDir
    },
    async setupOutputDir() {
      await fs.rm(targetDir, { recursive: true, force: true })
      await fs.mkdir(reportsDir, { recursive: true })
      await fs.cp(DIR_CLIENT, targetDir, { recursive: true })
      await Promise.all([
        fs.writeFile(
          join(targetDir, 'index.html'),
          (await fs.readFile(join(targetDir, 'index.html'), 'utf-8'))
            .replace(
              'data-vite-inspect-mode="DEV"',
              'data-vite-inspect-mode="BUILD"',
            ),
        ),
      ])
    },
    async generateForEnv(pluginCtx: Rollup.PluginContext) {
      const env = pluginCtx.environment
      await Promise.all([...ctx._idToInstances.values()]
        .filter(v => v.environments.has(env.name))
        .map((v) => {
          const e = v.environments.get(env.name)!
          const key = `${v.id}-${env.name}`
          return [key, e] as const
        })
        .map(async ([key, env]) => {
          await fs.mkdir(join(reportsDir, key, 'transforms'), { recursive: true })

          return await Promise.all([
            writeJSON(
              join(reportsDir, key, 'modules.json'),
              env.getModulesList(pluginCtx),
            ),
            writeJSON(
              join(reportsDir, key, 'metric-plugins.json'),
              env.getPluginMetrics(),
            ),
            ...Object.entries(env.data.transform)
              .map(([id, info]) => writeJSON(
                join(reportsDir, key, 'transforms', `${hash(id)}.json`),
            <ModuleTransformInfo>{
              resolvedId: id,
              transforms: info,
            },
              )),
          ])
        }),
      )
    },
    async generateMetadata() {
      await writeJSON(
        join(reportsDir, 'metadata.json'),
        ctx.getMetadata(),
      )
    },
  }
}

function writeJSON(filename: string, data: any) {
  return fs.writeFile(filename, `${JSON.stringify(data, null, 2)}\n`)
}
