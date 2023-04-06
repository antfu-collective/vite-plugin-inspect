import { expose } from 'comlink'
import { diff_match_patch as Diff } from 'diff-match-patch'

function calculateDiff(left: string, right: string) {
  const diff = new Diff()
  const changes = diff.diff_main(left, right)
  diff.diff_cleanupSemantic(changes)
  return changes
}

const exports = {
  calculateDiff,
}

export type Exports = typeof exports

expose(exports)
