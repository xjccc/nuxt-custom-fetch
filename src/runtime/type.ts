import type { FetchRequest, FetchOptions, FetchError, FetchResponse } from 'ofetch'

export type PickFrom<T, K extends Array<string>> = T extends Array<any> ? T : T extends Record<string, any> ? keyof T extends K[number] ? T : K[number] extends never ? T : Pick<T, K[number]> : T;
export type KeysOf<T> = Array<T extends T ? keyof T extends string ? keyof T : never : never>;

export interface OnRequestType {
  request: FetchRequest
  options: FetchOptions
}

export interface OnRequestErrorType {
  request: FetchRequest
  options: FetchOptions
  error: FetchError
}

export interface OnResponseType {
  request: FetchRequest
  options: FetchOptions
  response: FetchResponse<any>
}

export interface OnResponseErrorType {
  request: FetchRequest
  options: FetchOptions
  response: FetchResponse<any>
}
export type FetchMethod = 'options' | 'GET' | 'POST' | 'get' | 'HEAD' | 'PATCH' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'post' | 'head' | 'patch' | 'put' | 'delete' | 'connect' | 'trace' | undefined

export interface HTTPConfig extends Omit<FetchOptions, 'method'> {
  key?: string
  immutableKey?: boolean
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
