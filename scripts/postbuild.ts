import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function patchCjs(cjsModulePath: string, name: string) {
  const cjsModule = readFileSync(cjsModulePath, 'utf-8')
  writeFileSync(
    cjsModulePath,
    cjsModule
      .replace(`module.exports = ${name};`, `exports = ${name};`),
    { encoding: 'utf-8' },
  )
}

patchCjs(resolve('./dist/nuxt.cjs'), 'nuxt')
patchCjs(resolve('./dist/index.cjs'), 'index.PluginInspect')
