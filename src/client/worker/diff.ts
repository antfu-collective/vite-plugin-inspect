import type { Remote } from 'comlink'
import type { Exports } from './diff.worker'
import { wrap } from 'comlink'

let diffWorker: Remote<Exports> | undefined

export async function calculateDiffWithWorker(left: string, right: string) {
  if (!diffWorker) {
    diffWorker = wrap(
      new Worker(new URL('./diff.worker.ts', import.meta.url), {
        type: 'module',
      }),
    )
  }

  const result = await diffWorker.calculateDiff(left, right)
  return result
}
