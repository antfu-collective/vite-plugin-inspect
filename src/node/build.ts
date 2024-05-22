import { isAbsolute, join, resolve } from 'node:path'
import fs from 'fs-extra'
import type { ResolvedConfig } from 'vite'
import { hash } from 'ohash'
import type { ModuleTransformInfo } from '../types'
import { DIR_CLIENT } from '../dir'
import type { Recorder } from './recorder'
import { DUMMY_LOAD_PLUGIN_NAME } from './constants'
import type { InspectContext } from './context'

export async function generateBuild(ctx: InspectContext, config: ResolvedConfig) {
  const {
    outputDir = '.vite-inspect',
  } = ctx.options

  // outputs data to `node_modules/.vite/inspect folder
  const targetDir = isAbsolute(outputDir)
    ? outputDir
    : resolve(config.root, outputDir)
  const reportsDir = join(targetDir, 'reports')

  await fs.emptyDir(targetDir)
  await fs.ensureDir(reportsDir)
  await fs.copy(DIR_CLIENT, targetDir)

  const isVirtual = (pluginName: string, transformName: string) => pluginName !== DUMMY_LOAD_PLUGIN_NAME && transformName !== 'vite:load-fallback'

  function list() {
    return {
      root: config.root,
      modules: ctx.getModulesInfo(ctx.recorderClient, null, isVirtual),
      ssrModules: ctx.getModulesInfo(ctx.recorderServer, null, isVirtual),
    }
  }

  async function dumpModuleInfo(dir: string, recorder: Recorder, ssr = false) {
    await fs.ensureDir(dir)
    return Promise.all(Object.entries(recorder.transform)
      .map(([id, info]) => fs.writeJSON(
        join(dir, `${hash(id)}.json`),
        <ModuleTransformInfo>{
          resolvedId: ctx.resolveId(id, ssr),
          transforms: info,
        },
        { spaces: 2 },
      ),
      ),
    )
  }

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
      join(reportsDir, 'list.json'),
      list(),
      { spaces: 2 },
    ),
    fs.writeJSON(
      join(reportsDir, 'metrics.json'),
      ctx.getPluginMetrics(false),
      { spaces: 2 },
    ),
    fs.writeJSON(
      join(reportsDir, 'metrics-ssr.json'),
      ctx.getPluginMetrics(true),
      { spaces: 2 },
    ),
    dumpModuleInfo(join(reportsDir, 'transform'), ctx.recorderClient),
    dumpModuleInfo(join(reportsDir, 'transform-ssr'), ctx.recorderServer, true),
  ])

  return targetDir
}
