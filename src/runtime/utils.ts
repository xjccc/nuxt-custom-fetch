import type { MaybeRef } from '#imports'
import type { CustomFetchOptions, FetchMethod } from './type'
import { toValue } from '#imports'
import { hash } from 'ohash'

export function Noop () { }
export function generateOptionSegments (opts: CustomFetchOptions & { method: FetchMethod }) {
  const segments: Array<string | undefined | Record<string, string>> = [toValue(opts.method as MaybeRef<string | undefined> | undefined)?.toUpperCase() || 'GET', toValue(opts.baseURL)]
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
    segments.push(hash(toValue(opts.body)))
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
