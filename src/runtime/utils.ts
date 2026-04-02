import type { MaybeRef } from '#imports'
import type { CustomFetchOptions, FetchMethod, MaybeRefDeep } from './type'
import { toValue } from '#imports'
import { isPlainObject } from '@vue/shared'
import { hash } from 'ohash'

export function Noop () { }

type RuntimeConstructor<T = unknown> = abstract new (...args: any[]) => T

function getGlobalConstructor<T = unknown> (name: string): RuntimeConstructor<T> | undefined {
  const constructor = (globalThis as Record<string, unknown>)[name]

  return typeof constructor === 'function' ? constructor as RuntimeConstructor<T> : undefined
}

function isInstanceOf<T = unknown> (value: unknown, constructor: RuntimeConstructor<T> | undefined): value is T {
  return typeof constructor === 'function' && value instanceof constructor
}

function isBlobValue (value: unknown): value is Blob {
  return isInstanceOf(value, getGlobalConstructor<Blob>('Blob'))
}

function isFileValue (value: unknown): value is File {
  return isInstanceOf(value, getGlobalConstructor<File>('File'))
}

function isFormDataValue (value: unknown): value is FormData {
  return isInstanceOf(value, getGlobalConstructor<FormData>('FormData'))
}

function isHeadersValue (value: unknown): value is Headers {
  return isInstanceOf(value, getGlobalConstructor<Headers>('Headers'))
}

function isRequestValue (value: unknown): value is Request {
  return isInstanceOf(value, getGlobalConstructor<Request>('Request'))
}

function isURLSearchParamsValue (value: unknown): value is URLSearchParams {
  return isInstanceOf(value, getGlobalConstructor<URLSearchParams>('URLSearchParams'))
}

function isSpecialNativeValue (value: unknown): value is ArrayBuffer | Blob | Date | File | FormData | Headers | Request | URLSearchParams {
  if (!value || typeof value !== 'object') {
    return false
  }

  return value instanceof ArrayBuffer
    || isBlobValue(value)
    || value instanceof Date
    || isFileValue(value)
    || isFormDataValue(value)
    || isHeadersValue(value)
    || isRequestValue(value)
    || isURLSearchParamsValue(value)
}

export function resolveReactiveValue<T> (value: MaybeRefDeep<T>): T
export function resolveReactiveValue<T> (value: T): T
export function resolveReactiveValue<T> (value: T) {
  const resolvedValue = toValue(value)

  if (resolvedValue !== value) {
    return resolveReactiveValue(resolvedValue)
  }

  if (Array.isArray(resolvedValue)) {
    return resolvedValue.map(item => resolveReactiveValue(item))
  }

  if (isSpecialNativeValue(resolvedValue)) {
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
    const obj = resolveReactiveValue(toValue(_obj))
    if (!obj) {
      continue
    }

    const unwrapped: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      unwrapped[String(toValue(key))] = resolveReactiveValue(value)
    }
    segments.push(unwrapped)
  }
  if (opts.body !== undefined) {
    const value = resolveReactiveValue(toValue(opts.body))
    if (!value) {
      segments.push(hash(value))
    }
    else if (value instanceof ArrayBuffer) {
      segments.push(hash(Object.fromEntries(Array.from(new Uint8Array(value).entries(), ([key, item]) => [key, item.toString()]))))
    }
    else if (isFormDataValue(value)) {
      const obj: Record<string, string> = {}
      for (const entry of value.entries()) {
        const [key, val] = entry
        obj[key] = isFileValue(val) ? val.name : val
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
