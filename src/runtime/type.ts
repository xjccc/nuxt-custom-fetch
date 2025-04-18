import type { FetchOptions } from 'ofetch'

export type { FetchContext, FetchResponse } from 'ofetch'

/** https://github.com/nuxt/nuxt/blob/edeb0759a455dbafd030f0b5ae1d5a39ad0dfc2a/packages/nuxt/src/app/composables/asyncData.ts#L20 */
export type PickFrom<T, K extends Array<string>> = T extends Array<any> ? T : T extends Record<string, any> ? (keyof T extends K[number] ? T : K[number] extends never ? T : Pick<T, K[number]>) : T
export type KeysOf<T> = Array<T extends T ? (keyof T extends string ? keyof T : never) : never>

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
  key?: string
  immutableKey?: boolean
  showLogs?: boolean
  baseURL?: string
  useHandler?: boolean
  handler?: (params: Record<string, any>) => Record<string, any>
  offline?: () => void
}

export interface Interceptors {
  onRequest?: FetchOptions['onRequest']
  onRequestError?: FetchOptions['onRequestError']
  onResponse?: FetchOptions['onResponse']
  onResponseError?: FetchOptions['onResponseError']
}
