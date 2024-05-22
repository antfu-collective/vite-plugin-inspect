import type { ResolveIdInfo, TransformInfo } from '../types'
import { DUMMY_LOAD_PLUGIN_NAME } from './constants'

export class Recorder {
  data: {
    transform: Record<string, TransformInfo[]>
    resolveId: Record<string, ResolveIdInfo[]>
    transformCounter: Record<string, number>
  } = {
      transform: {},
      resolveId: {},
      transformCounter: {},
    }

  recordTransform(id: string, info: TransformInfo, preTransformCode: string) {
    // initial transform (load from fs), add a dummy
    if (!this.data.transform[id] || !this.data.transform[id].some(tr => tr.result)) {
      this.data.transform[id] = [{
        name: DUMMY_LOAD_PLUGIN_NAME,
        result: preTransformCode,
        start: info.start,
        end: info.start,
        sourcemaps: info.sourcemaps,
      }]
      this.data.transformCounter[id] = (this.data.transformCounter[id] || 0) + 1
    }
    // record transform
    this.data.transform[id].push(info)
  }

  recordLoad(id: string, info: TransformInfo) {
    this.data.transform[id] = [info]
    this.data.transformCounter[id] = (this.data.transformCounter[id] || 0) + 1
  }

  recordResolveId(id: string, info: ResolveIdInfo) {
    if (!this.data.resolveId[id])
      this.data.resolveId[id] = []
    this.data.resolveId[id].push(info)
  }

  invalidate(id: string) {
    delete this.data.transform[id]
  }
}
