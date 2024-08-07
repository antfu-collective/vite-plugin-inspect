import { isAbsolute, join, resolve } from 'node:path'
import process from 'node:process'
import fs from 'fs-extra'
import { hash } from 'ohash'
import type { ModuleTransformInfo } from '../types'
import { DIR_CLIENT } from '../dir'
import type { InspectContext } from './context'

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

  await fs.emptyDir(targetDir)
  await fs.ensureDir(reportsDir)
  await fs.copy(DIR_CLIENT, targetDir)

  await Promise.all([
    fs.writeFile(
      join(targetDir, 'index.html'),
      (await fs.readFile(join(targetDir, 'index.html'), 'utf-8'))
        .replace(
          'data-vite-inspect-mode="DEV"',
          'data-vite-inspect-mode="BUILD"',
        ),
    ),
    fs.writeJSON(
      join(reportsDir, 'metadata.json'),
      ctx.getMetadata(),
      { spaces: 2 },
    ),
    ...[...ctx._idToInstances.values()]
      .flatMap(v => [...v.environments.values()]
        .map((e) => {
          const key = `${v.id}-${e.env.name}`
          return [key, e] as const
        }),
      )
      .map(async ([key, env]) => {
        await fs.ensureDir(join(reportsDir, key))
        await fs.ensureDir(join(reportsDir, key, 'transforms'))

        return await Promise.all([
          fs.writeJSON(
            join(reportsDir, key, 'modules.json'),
            env.getModulesList(),
            { spaces: 2 },
          ),
          fs.writeJSON(
            join(reportsDir, key, 'metric-plugins.json'),
            env.getPluginMetrics(),
            { spaces: 2 },
          ),
          ...Object.entries(env.data.transform)
            .map(([id, info]) => fs.writeJSON(
              join(reportsDir, key, 'transforms', `${hash(id)}.json`),
              <ModuleTransformInfo>{
                resolvedId: id,
                transforms: info,
              },
              { spaces: 2 },
            )),
        ])
      }),
  ])

  return targetDir
}
