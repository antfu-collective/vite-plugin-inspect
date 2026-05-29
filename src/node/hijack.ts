import type { HookHandler, Plugin, Rollup } from 'vite'
import type { ParsedError } from '../types'
import type { InspectContext } from './context'
import { parse as parseErrorStacks } from 'error-stack-parser-es'
import { createDebug } from 'obug'

const debug = createDebug('vite-plugin-inspect')

type AnyFn = (...args: any) => any
type AsFn<T> = T extends AnyFn ? T : AnyFn
type PluginHookFn<K extends keyof Plugin> = AsFn<NonNullable<HookHandler<Plugin[K]>>>

type HookWrapper<K extends keyof Plugin> = (
  fn: PluginHookFn<K>,
  context: ThisParameterType<PluginHookFn<K>>,
  args: NonNullable<Parameters<PluginHookFn<K>>>,
  order: string,
) => ReturnType<PluginHookFn<K>>

function hijackHook<K extends keyof Plugin>(plugin: Plugin, name: K, wrapper: HookWrapper<K>) {
  if (!plugin[name])
    return

  debug(`hijack plugin "${name}"`, plugin.name)

  // @ts-expect-error future
  let order = plugin.order || plugin.enforce || 'normal'

  const hook = plugin[name] as any
  if ('handler' in hook) {
    // rollup hook
    const oldFn = hook.handler
    order += `-${hook.order || hook.enforce || 'normal'}`
    hook.handler = function (this: any, ...args: any) {
      return wrapper(oldFn, this, args, order)
    }
  }
  else if ('transform' in hook) {
    // transformIndexHTML
    const oldFn = hook.transform
    order += `-${hook.order || hook.enforce || 'normal'}`
    hook.transform = function (this: any, ...args: any) {
      return wrapper(oldFn, this, args, order)
    }
  }
  else {
    // vite hook
    const oldFn = hook
    plugin[name] = function (this: any, ...args: any) {
      return wrapper(oldFn, this, args, order)
    }
  }
}

const hijackedPlugins = new WeakSet<Plugin>()

export function hijackPlugin(
  plugin: Plugin,
  ctx: InspectContext,
) {
  if (hijackedPlugins.has(plugin))
    return
  hijackedPlugins.add(plugin)

  hijackHook(plugin, 'transform', async (fn, context, args, order) => {
    const code = args[0]
    const id = args[1]

    let _result: Rollup.TransformResult
    let error: any

    const start = Date.now()
    try {
      _result = await fn.apply(context, args) as Rollup.TransformResult
    }
    catch (_err) {
      error = _err
    }
    const end = Date.now()

    const result = error ? '[Error]' : (typeof _result === 'string' ? _result : _result?.code?.toString())
    if (ctx.filter(id)) {
      const sourcemaps = typeof _result === 'string' ? null : _result?.map
      ctx
        .getEnvContext(context?.environment)
        ?.recordTransform(id, {
          name: plugin.name,
          result,
          start,
          end,
          order,
          sourcemaps,
          error: error ? parseError(error) : undefined,
        }, code)
    }

    if (error)
      throw error

    return _result
  })

  hijackHook(plugin, 'load', async (fn, context, args) => {
    const id = args[0]

    let _result: Rollup.LoadResult
    let error: any

    const start = Date.now()
    try {
      _result = await fn.apply(context, args) as Rollup.LoadResult
    }
    catch (err) {
      error = err
    }
    const end = Date.now()

    const result = error
      ? '[Error]'
      : (typeof _result === 'string'
          ? _result
          : _result?.code)
    const sourcemaps = typeof _result === 'string'
      ? null
      : _result?.map

    if (result) {
      ctx
        .getEnvContext(context?.environment)
        ?.recordLoad(id, {
          name: plugin.name,
          result,
          start,
          end,
          sourcemaps,
          error: error ? parseError(error) : undefined,
        })
    }

    if (error)
      throw error

    return _result
  })

  hijackHook(plugin, 'resolveId', async (fn, context, args) => {
    const id = args[0]

    let _result: Rollup.ResolveIdResult
    let error: any

    const start = Date.now()
    try {
      _result = await fn.apply(context, args)
    }
    catch (err) {
      error = err
    }
    const end = Date.now()

    if (!ctx.filter(id)) {
      if (error)
        throw error

      return _result
    }

    const result = error
      ? stringifyError(error)
      : (typeof _result === 'object'
          ? _result?.id
          : _result)

    if (result && result !== id) {
      ctx
        .getEnvContext(context?.environment)
        ?.recordResolveId(id, {
          name: plugin.name,
          result,
          start,
          end,
          error,
        })
    }

    if (error)
      throw error

    return _result
  })
}

function parseError(error: any): ParsedError {
  const stack = parseErrorStacks(error, { allowEmpty: true })
  const message = error.message || String(error)
  return {
    message,
    stack,
    raw: error,
  }
}

function stringifyError(err: any) {
  return String(err.stack ? err.stack : err)
}
