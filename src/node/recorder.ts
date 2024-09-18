import type { ResolveIdInfo, TransformInfo } from '../types'
import { DUMMY_LOAD_PLUGIN_NAME } from './constants'
import type { ViteInspectContext } from './context'

export class Recorder {
  transform: Record<string, TransformInfo[]> = {}
  resolveId: Record<string, ResolveIdInfo[]> = {}
  transformCounter: Record<string, number> = {}

  constructor(
    public context: ViteInspectContext,
  ) {
    this.context = context
  }

  recordTransform(id: string, info: TransformInfo, preTransformCode: string) {
    id = this.context.normalizeId(id)
    // initial transform (load from fs), add a dummy
    if (!this.transform[id] || !this.transform[id].some(tr => tr.result)) {
      this.transform[id] = [{
        name: DUMMY_LOAD_PLUGIN_NAME,
        result: preTransformCode,
        start: info.start,
        end: info.start,
        sourcemaps: info.sourcemaps,
      }]
      this.transformCounter[id] = (this.transformCounter[id] || 0) + 1
    }
    // record transform
    this.transform[id].push(info)
  }

  recordLoad(id: string, info: TransformInfo) {
    id = this.context.normalizeId(id)
    this.transform[id] = [info]
    this.transformCounter[id] = (this.transformCounter[id] || 0) + 1
  }

  recordResolveId(id: string, info: ResolveIdInfo) {
    id = this.context.normalizeId(id)
    if (!this.resolveId[id])
      this.resolveId[id] = []
    this.resolveId[id].push(info)
  }

  invalidate(id: string) {
    id = this.context.normalizeId(id)
    delete this.transform[id]
  }
}
