import type { AddressInfo } from 'node:net'
import { createServer } from 'node:http'
import c from 'ansis'
import sirv from 'sirv'
import { openBrowser } from './utils'

export function createPreviewServer(staticPath: string) {
  const server = createServer()

  const statics = sirv(staticPath)
  server.on('request', (req, res) => {
    statics(req, res, () => {
      res.statusCode = 404
      res.end('File not found')
    })
  })

  server.listen(0, () => {
    const { port } = server.address() as AddressInfo
    const url = `http://localhost:${port}`
    // eslint-disable-next-line no-console
    console.log(`  ${c.green('➜')}  ${c.bold('Inspect Preview Started')}: ${url}`)
    openBrowser(url)
  })
}
