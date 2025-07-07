import type { MaybeRef } from '#imports'
import type { CustomFetchOptions, FetchMethod } from './type'
import { reactive, toValue } from '#imports'
import { isPlainObject } from '@vue/shared'
import { hash } from 'ohash'

export function Noop () { }
export function generateOptionSegments<_ResT> (opts: CustomFetchOptions & { method: FetchMethod }) {
  const segments: Array<string | undefined | Record<string, string>> = [
    toValue(opts.method as MaybeRef<string | undefined> | undefined)?.toUpperCase() || 'GET',
    toValue(opts.baseURL)
  ]
  for (const _obj of [opts.params || opts.query]) {
    const obj = toValue(_obj)
    if (!obj) {
      continue
    }

    const unwrapped: Record<string, string> = {}
    for (const [key, value] of Object.entries(obj)) {
      unwrapped[toValue(key)] = toValue(value)
    }
    segments.push(unwrapped)
  }
  if (opts.body) {
    const value = toValue(opts.body)
    if (!value) {
      segments.push(hash(value))
    }
    else if (value instanceof ArrayBuffer) {
      segments.push(hash(Object.fromEntries([...new Uint8Array(value).entries()].map(([k, v]) => [k, v.toString()]))))
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
      segments.push(hash(reactive(value)))
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
