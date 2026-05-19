import fs from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const clientRoot = resolve(__dirname, '../src/client')
const testOutDir = resolve(__dirname, '../dist/__client_build_test__')

beforeAll(async () => {
  fs.rmSync(testOutDir, { recursive: true, force: true })

  await build({
    configFile: resolve(clientRoot, 'vite.config.ts'),
    root: clientRoot,
    logLevel: 'silent',
    build: {
      outDir: testOutDir,
      emptyOutDir: true,
    },
  })
}, 180_000)

afterAll(() => {
  fs.rmSync(testOutDir, { recursive: true, force: true })
})

describe('client build (#169)', () => {
  it('index.html does not contain a /@fs/ dev-server path', () => {
    const html = fs.readFileSync(resolve(testOutDir, 'index.html'), 'utf-8')
    expect(html).not.toContain('/@fs/')
  })

  it('index.html does not reference @vitejs/devtools inject.js by absolute path', () => {
    const html = fs.readFileSync(resolve(testOutDir, 'index.html'), 'utf-8')
    expect(html).not.toMatch(/node_modules.*@vitejs[\\/+]devtools.*inject\.js/)
  })
})
