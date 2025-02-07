import type { ModuleTransformInfo } from '../types'
import type { InspectContext } from './context'
import fs from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import process from 'node:process'
import { hash } from 'ohash'
import { DIR_CLIENT } from '../dirs'

export async function generateBuild(
  ctx: InspectContext,
) {
  const {
    outputDir = '.vite-inspect',
  } = ctx.options

  // outputs data to `.vite-inspect` folder
  const targetDir = isAbsolute(outputDir)
    ? outputDir
    : resolve(process.cwd(), outputDir)
  const reportsDir = join(targetDir, 'reports')

  await fs.rm(targetDir, { recursive: true })
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
    writeJSON(
      join(reportsDir, 'metadata.json'),
      ctx.getMetadata(),
    ),
    ...[...ctx._idToInstances.values()]
      .flatMap(v => [...v.environments.values()]
        .map((e) => {
          const key = `${v.id}-${e.env.name}`
          return [key, e] as const
        }),
      )
      .map(async ([key, env]) => {
        await fs.mkdir(join(reportsDir, key, 'transforms'), { recursive: true })

        return await Promise.all([
          writeJSON(
            join(reportsDir, key, 'modules.json'),
            env.getModulesList(),
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
  ])

  return targetDir
}

function writeJSON(filename: string, data: any) {
  return fs.writeFile(filename, JSON.stringify(data, null, 2) + '\n')
}
