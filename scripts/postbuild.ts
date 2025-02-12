import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

function patchCjs(cjsModulePath: string, name: string) {
  const cjsModule = readFileSync(cjsModulePath, 'utf-8')
  writeFileSync(
    cjsModulePath,
    cjsModule
      .replace(`module.exports = ${name};`, `exports = ${name};`),
    { encoding: 'utf-8' },
  )
}

function includeClientFonts() {
  const fonts = resolve('node_modules/.cache/unocss/fonts')
  let files = readdirSync(
    fonts,
    {
      recursive: false,
      encoding: 'utf8',
    },
  )
  const replacements = new Map<string, string>()
  const client = resolve('dist/client/assets')
  for (const file of files) {
    const name = basename(file)
    if (!name.endsWith('.woff2'))
      continue
    replacements.set(`/assets/fonts/${name}`, `./fonts/${name}`)
    const path = resolve(client, 'fonts')
    mkdirSync(path, { recursive: true })
    copyFileSync(resolve(fonts, file), resolve(path, name))
  }
  files = readdirSync(client, { recursive: false, encoding: 'utf8' })
  for (const file of files) {
    const name = basename(file)
    if (!name.startsWith('index-') && !name.endsWith('.css'))
      continue
    let content = readFileSync(resolve(client, file), 'utf-8')
    for (const [from, to] of replacements) {
      content = content.replace(from, to)
    }
    writeFileSync(
      resolve(client, file),
      content,
      'utf8',
    )
  }
}

patchCjs(resolve('./dist/nuxt.cjs'), 'nuxt')
patchCjs(resolve('./dist/index.cjs'), 'index.PluginInspect')

includeClientFonts()
