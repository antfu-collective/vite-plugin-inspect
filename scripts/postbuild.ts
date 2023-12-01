import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function patchCjs(cjsModulePath: string, name: string) {
  const cjsModule = readFileSync(cjsModulePath, 'utf-8')
  writeFileSync(
    cjsModulePath,
    cjsModule.replace(`module.exports = ${name};`, `exports.default = ${name};\nexports.__esModule = true;`),
    // cjsModule.replace(`module.exports = ${cjsName};`, `module.exports = ${cjsName};\nexports.default = ${cjsName};`),
    { encoding: 'utf-8' },
  )
}

patchCjs(resolve('./dist/index.cjs'), 'PluginInspect')
patchCjs(resolve('./dist/nuxt.cjs'), 'nuxt')
