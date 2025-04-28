import type { MaybeRefOrGetter } from '#imports'
import type { FetchOptions } from 'ofetch'

export type { FetchContext, FetchResponse } from 'ofetch'

/** https://github.com/nuxt/nuxt/blob/edeb0759a455dbafd030f0b5ae1d5a39ad0dfc2a/packages/nuxt/src/app/composables/asyncData.ts#L20 */
export type PickFrom<T, K extends Array<string>> = T extends Array<any>
  ? T
  : T extends Record<string, any>
    ? keyof T extends K[number]
      ? T // Exact same keys as the target, skip Pick
      : K[number] extends never
        ? T
        : Pick<T, K[number]>
    : T

export type KeysOf<T> = Array<
  T extends T // Include all keys of union types, not just common keys
    ? keyof T extends string
      ? keyof T
      : never
    : never
>
export type FetchMethod =
  | 'options'
  | 'GET'
  | 'POST'
  | 'get'
  | 'HEAD'
  | 'PATCH'
  | 'PUT'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'
  | 'post'
  | 'head'
  | 'patch'
  | 'put'
  | 'delete'
  | 'connect'
  | 'trace'
  | undefined

export interface CustomFetchOptions extends Omit<FetchOptions, 'method'> {
  /** unique key for fetch */
  key?: MaybeRefOrGetter<string>
  /** hash key for fetch, with [customFetch: + url] without query */
  immutableKey?: boolean
  /** show logs */
  showLogs?: boolean
  baseURL?: string
  /** is use handler to deal with query or pramas */
  useHandler?: boolean
  /** handler to deal with query or pramas */
  handler?: (mergedObject: FetchOptions['params'] & FetchOptions['query']) => Record<string, any>
  /** offline handler */
  offline?: () => void
}

export interface Interceptors {
  onRequest?: FetchOptions['onRequest']
  onRequestError?: FetchOptions['onRequestError']
  onResponse?: FetchOptions['onResponse']
  onResponseError?: FetchOptions['onResponseError']
}
