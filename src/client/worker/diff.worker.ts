import { expose } from 'comlink'
import { diff_match_patch as Diff } from 'diff-match-patch'

const calucateDiff = (left: string, right: string) => {
  const diff = new Diff()
  const changes = diff.diff_main(left, right)
  diff.diff_cleanupSemantic(changes)
  return changes
}

const exports = {
  calucateDiff,
}

export type Exports = typeof exports

expose(exports)
