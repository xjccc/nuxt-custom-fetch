
import type { FetchRequest, FetchOptions, FetchError, FetchResponse } from 'ofetch'

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
  baseURL?: string
  extraParams?: string[]
  useParamsHandler?: boolean
  paramsHandler?: (params: FetchOptions['params']) => HTTPConfig
  offline?: () => void
  method?: FetchMethod
}

export interface Interceptors {
  onRequest?: FetchOptions['onRequest']
  onRequestError?: FetchOptions['onRequestError']
  onResponse?: FetchOptions['onResponse']
  onResponseError?: FetchOptions['onResponseError']
}

export type AjaxConfig = FetchOptions & { key?: string, extraParams?: string[], offline?: () => void, interceptors: Interceptors }
