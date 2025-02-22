import { readFile, writeFile } from 'node:fs/promises'
// import { readFileSync, writeFileSync } from 'node:fs'
import { findExports, findStaticImports, parseStaticImport } from 'mlly'

const regexp = /export\s*\{([^}]*)\}/
const defaultExportRegexp = /\s*as\s+default\s*/
const typeExportRegexp = /\s*type\s+/

// Temporal fix for unbuild cjs plugin: will work only here.
// The current unbuild cjs plugin fixing only some default exports in d.cts files.
// This script will not fix export { default } from '<some-specifier>'.
async function fixDefaultCJSExports(path: string) {
  const code = await readFile(path, 'utf-8')

  const defaultExport = findExports(code).find(e =>
    e.names.includes('default'),
  )

  if (!defaultExport) {
    return
  }

  const match = defaultExport.code.match(regexp)
  if (!match?.length) {
    return
  }

  let defaultAlias: string | undefined
  const exportsEntries: string[] = []
  for (const exp of match[1].split(',').map(e => e.trim())) {
    const m = exp.match(defaultExportRegexp)
    if (m) {
      defaultAlias = exp.replace(m[0], '')
    }
    else {
      exportsEntries.push(exp)
    }
  }

  if (!defaultAlias) {
    // handle default export like:
    // import defaultExport from '<some-identifier>'
    // export default defaultExport
    // dts plugin will generate code like:
    // import defaultExport from '<some-identifier>';
    // export { default } from '<some-identifier>';
    const defaultStaticImport = findStaticImports(code).find(i => i.specifier === defaultExport.specifier)
    const defaultImport = defaultStaticImport ? parseStaticImport(defaultStaticImport).defaultImport : undefined
    if (!defaultExport) {
      return
    }
    // this will generate the following code:
    // import defaultExport from '<some-identifier>';
    // export = defaultExport;
    await writeFile(
      path,
      code.replace(
        defaultExport.code,
        `export = ${defaultImport}`,
      ),
      'utf-8',
    )
    return
  }

  let exportStatement = exportsEntries.length > 0 ? undefined : ''

  // replace export { type A, type B, type ... } with export type { A, B, ... }
  // that's, if all remaining exports are type exports, replace export {} with export type {}
  if (exportStatement === undefined) {
    const imports = findStaticImports(code).map(i => i.imports)
    let someExternalExport = false
    const allRemainingExports = exportsEntries.map((exp) => {
      if (someExternalExport) {
        return [exp, ''] as const
      }
      if (!imports.includes(exp)) {
        const m = exp.match(typeExportRegexp)
        if (m) {
          const name = exp.replace(m[0], '').trim()
          if (!imports.includes(name)) {
            return [exp, name] as const
          }
        }
      }
      someExternalExport = true
      return [exp, ''] as const
    })
    exportStatement = someExternalExport
      ? `;\nexport { ${allRemainingExports.map(([e, _]) => e).join(', ')} }`
      : `;\nexport type { ${allRemainingExports.map(([_, t]) => t).join(', ')} }`
  }

  await writeFile(
    path,
    code.replace(
      defaultExport.code,
      `export = ${defaultAlias}${exportStatement}`,
    ),
    'utf-8',
  )
}

function mapDualPaths(files: string[]) {
  return files.map(name => [
    fixDefaultCJSExports(`dist/${name}.d.ts`),
    fixDefaultCJSExports(`dist/${name}.d.cts`),
  ])
}

await Promise.all(mapDualPaths(['nuxt', 'index']))
