import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function patchCjs(cjsModulePath: string, name: string) {
  const cjsModule = readFileSync(cjsModulePath, 'utf-8')
  writeFileSync(
    cjsModulePath,
    cjsModule.replace(`module.exports = ${name};`, `exports.default = ${name};`),
    { encoding: 'utf-8' },
  )
}

rmSync(resolve('./dist/index.d.mts'))
rmSync(resolve('./dist/nuxt.d.mts'))

readdirSync('./dist/shared')
  .filter(file => file.endsWith('.d.mts'))
  .forEach((file) => {
    rmSync(resolve('./dist/shared', file))
  })

patchCjs(resolve('./dist/index.cjs'), 'PluginInspect')
patchCjs(resolve('./dist/nuxt.cjs'), 'nuxt')
