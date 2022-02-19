import type { Remote } from 'comlink'
import { wrap } from 'comlink'
import type { Exports } from './diff.worker'

let diffWorker: Remote<Exports> | undefined

export const calucateDiffWithWorker = async(left: string, right: string) => {
  if (!diffWorker) {
    diffWorker = wrap(
      new Worker(new URL('./diff.worker.ts', import.meta.url), {
        type: 'module',
      }),
    )
  }

  const result = await diffWorker.calucateDiff(left, right)
  return result
}
