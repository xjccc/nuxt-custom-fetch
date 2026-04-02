import type { MaybeRef } from '#imports'
import type { CustomFetchOptions, FetchMethod, MaybeRefDeep } from './type'
import { toValue, unref } from '#imports'
import { isPlainObject } from '@vue/shared'
import { hash } from 'ohash'

export function Noop () { }

export function resolveReactiveValue<T> (value: MaybeRefDeep<T>): T
export function resolveReactiveValue<T> (value: T): T
export function resolveReactiveValue<T> (value: T) {
  const resolvedValue = unref(value)

  if (resolvedValue !== value) {
    return resolveReactiveValue(resolvedValue)
  }

  if (Array.isArray(resolvedValue)) {
    return resolvedValue.map(item => resolveReactiveValue(item))
  }

  if (
    resolvedValue instanceof ArrayBuffer
    || resolvedValue instanceof Blob
    || resolvedValue instanceof Date
    || resolvedValue instanceof File
    || resolvedValue instanceof FormData
    || resolvedValue instanceof Headers
    || resolvedValue instanceof Request
    || resolvedValue instanceof URLSearchParams
  ) {
    return resolvedValue
  }

  if (isPlainObject(resolvedValue)) {
    return Object.fromEntries(Object.entries(resolvedValue).map(([key, item]) => [key, resolveReactiveValue(item)]))
  }

  return resolvedValue
}

export function generateOptionSegments<_ResT> (opts: CustomFetchOptions & { method: MaybeRef<FetchMethod> }) {
  const segments: Array<string | undefined | Record<string, unknown>> = [
    toValue(opts.method as MaybeRef<string | undefined> | undefined)?.toUpperCase() || 'GET',
    toValue(opts.baseURL)
  ]
  for (const _obj of [opts.params, opts.query]) {
    const obj = toValue(_obj)
    if (!obj) {
      continue
    }

    const unwrapped: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      unwrapped[String(toValue(key))] = toValue(value)
    }
    segments.push(unwrapped)
  }
  if (opts.body) {
    const value = toValue(opts.body)
    if (!value) {
      segments.push(hash(value))
    }
    else if (value instanceof ArrayBuffer) {
      segments.push(hash(Object.fromEntries(Array.from(new Uint8Array(value).entries(), ([key, item]) => [key, item.toString()]))))
    }
    else if (value instanceof FormData) {
      const obj: Record<string, string> = {}
      for (const entry of value.entries()) {
        const [key, val] = entry
        obj[key] = val instanceof File ? val.name : val
      }
      segments.push(hash(obj))
    }
    else if (isPlainObject(value)) {
      segments.push(hash(resolveReactiveValue(value)))
    }
    else {
      try {
        segments.push(hash(value))
      }
      catch {
        console.warn('[Custom Fetch] Failed to hash body', value)
      }
    }
  }
  return segments
}
export function pick (obj: Record<string, any>, keys: string[]) {
  const newObj: any = {}
  for (const key of keys) {
    newObj[key] = obj[key]
  }

  return newObj
}
