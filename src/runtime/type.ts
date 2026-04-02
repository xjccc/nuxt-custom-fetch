import type { MaybeRefOrGetter } from '#imports'
import type { FetchOptions } from 'ofetch'

export type { FetchContext, FetchResponse } from 'ofetch'

type NativeFetchValue = ArrayBuffer | Blob | Date | File | FormData | Headers | Request | URLSearchParams

export type MaybeRefDeep<T>
  = T extends (...args: any[]) => any
    ? T
    : T extends NativeFetchValue
      ? MaybeRefOrGetter<T>
      : T extends Array<infer U>
        ? MaybeRefOrGetter<Array<MaybeRefDeep<U>>>
        : T extends ReadonlyArray<infer U>
          ? MaybeRefOrGetter<ReadonlyArray<MaybeRefDeep<U>>>
          : T extends object
            ? MaybeRefOrGetter<{ [K in keyof T]: MaybeRefDeep<T[K]> }>
            : MaybeRefOrGetter<T>

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
export type FetchMethod
  = | 'options'
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

export interface ResolvedCustomFetchOptions extends Omit<FetchOptions, 'method'> {
  method?: FetchMethod
}

export interface CustomFetchOptions extends Omit<FetchOptions, 'method' | 'baseURL' | 'query' | 'params' | 'body' | 'headers' | 'cache'> {
  /** unique key for fetch */
  key?: MaybeRefOrGetter<string>
  /** hash key for fetch, with [customFetch: + url] without query */
  immutableKey?: boolean
  /** show logs */
  showLogs?: boolean
  baseURL?: MaybeRefOrGetter<string>
  query?: MaybeRefDeep<NonNullable<FetchOptions['query']>>
  params?: MaybeRefDeep<NonNullable<FetchOptions['params']>>
  body?: MaybeRefDeep<FetchOptions['body']>
  headers?: MaybeRefDeep<NonNullable<FetchOptions['headers']>>
  cache?: MaybeRefOrGetter<FetchOptions['cache']>
  /** is use handler to deal with query or pramas */
  useHandler?: boolean
  /** handler to deal with query or pramas */
  handler?: (mergedObject: Record<string, unknown>) => Record<string, unknown>
  /** offline handler */
  offline?: () => void
}

export interface CustomFetchRequestOptions extends CustomFetchOptions {
  method: FetchMethod
}

export interface Interceptors {
  onRequest?: FetchOptions['onRequest']
  onRequestError?: FetchOptions['onRequestError']
  onResponse?: FetchOptions['onResponse']
  onResponseError?: FetchOptions['onResponseError']
}
