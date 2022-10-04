import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

export const DIR_DIST = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

export const DIR_CLIENT = resolve(DIR_DIST, '../dist/client')
