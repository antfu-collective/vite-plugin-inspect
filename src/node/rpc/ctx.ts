import type { InspectContext } from '../context'

const contextMap = new WeakMap<object, InspectContext>()

export function setInspectContext(devtoolsCtx: object, ctx: InspectContext): void {
  contextMap.set(devtoolsCtx, ctx)
}

export function getInspectContext(devtoolsCtx: object): InspectContext {
  const ctx = contextMap.get(devtoolsCtx)
  if (!ctx)
    throw new Error('InspectContext not found for this DevTools context')
  return ctx
}
