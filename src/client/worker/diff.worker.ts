import { expose } from 'comlink'
import { diffCleanupSemantic, diffMain } from 'diff-match-patch-es'

function calculateDiff(left: string, right: string) {
  const changes = diffMain(left, right)
  diffCleanupSemantic(changes)
  return changes
}

const exports = {
  calculateDiff,
}

export type Exports = typeof exports

expose(exports)
