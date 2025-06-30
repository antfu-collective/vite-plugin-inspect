import { expose } from 'comlink'
import { diffCleanupSemantic, diffMain } from 'diff-match-patch-es'

function calculateDiff(left: string, right: string) {
  const changes = diffMain(left.replace(/\r\n/g, '\n'), right.replace(/\r\n/g, '\n'))
  diffCleanupSemantic(changes)
  return changes
}

const exports = {
  calculateDiff,
}

export type Exports = typeof exports

expose(exports)
