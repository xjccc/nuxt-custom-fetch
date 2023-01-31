import { hash } from 'ohash'
import { createError } from 'h3'
import type { _AsyncData, AsyncDataOptions } from 'nuxt/dist/app/composables/asyncData'
import { HTTPConfig, Interceptors, OnRequestErrorType, OnRequestType, OnResponseErrorType, OnResponseType, AjaxConfig, FetchMethod } from './type'
import { useAsyncData } from '#imports'

export const ajax = <DataT, ErrorT = Error | null>(
  url: string,
  key: string,
  config: AjaxConfig,
  options?: AsyncDataOptions<DataT>
): Promise<_AsyncData<DataT, ErrorT>> => {
  if (process.client && navigator && !navigator.onLine) {
    config.offline && config.offline()
  }

  const { onRequest, onRequestError, onResponse, onResponseError, interceptors, ...restAjaxConfig } = config
  const defaultOptions = {
    onRequest (ctx: OnRequestType) {
      [interceptors.onRequest, onRequest].map(fn => fn && fn(ctx))
    },
    onRequestError (ctx: OnRequestErrorType) {
      [interceptors.onRequestError, onRequestError].map(fn => fn && fn(ctx))
      throw createError({
        statusCode: ctx.error.statusCode,
        statusMessage: ctx.error.message,
        message: ctx.error.message,
        fatal: true
      })
    },
    onResponse (ctx: OnResponseType) {
      interceptors.onResponse && interceptors.onResponse(ctx)
      onResponse && onResponse(ctx)
    },
    onResponseError (ctx: OnResponseErrorType) {
      [interceptors.onResponseError, onResponseError].map(fn => fn && fn(ctx))
      throw createError({
        statusCode: ctx.response.status,
        statusMessage: ctx.request.toString(),
        message: ctx.response._data,
        fatal: true
      })
    }
  }

  return useAsyncData<DataT, ErrorT>(key, () => $fetch(url, {
    ...defaultOptions,
    ...restAjaxConfig,
    method: restAjaxConfig.method as FetchMethod
  }), options) as Promise<_AsyncData<DataT, ErrorT>>
}

function getKey (url: string, config: HTTPConfig, extraParams: string[] = []) {
  const params = (config.query ? config.query : config.params) || {}
  const restConfig: { [key: string]: unknown } = {}
  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key) && !extraParams.includes(key)) {
      restConfig[key] = params[key]
    }
  }
  const key = hash(JSON.stringify(restConfig) + url)
  return key
}
export class HTTP {
  params: HTTPConfig = {}
  interceptors: Interceptors = {}

  constructor (config: HTTPConfig = { baseURL: '' }) {
    this.params = {
      ...config
    }
    this.interceptors = {
      onRequest: config.onRequest || function () { },
      onRequestError: config.onRequestError || function () { },
      onResponse: config.onResponse || function () { },
      onResponseError: config.onResponseError || function () { }
    }
  }

  private baseConfig (config: HTTPConfig): HTTPConfig {
    const { paramsHandler } = this.params
    const params = (config.query ? config.query : config.params) || {}
    if (paramsHandler && typeof paramsHandler === 'function') {
      return paramsHandler({ ...params })
    }
    return { ...params }
  }

  http<DataT, ErrorT = Error | null> (
    url: string,
    config: HTTPConfig & { key?: string } = {},
    options?: AsyncDataOptions<DataT>
  ) {
    const key = config.key ? config.key : getKey(url, config, this.params.extraParams)
    const query = this.baseConfig(config)
    return ajax<DataT, ErrorT>(url, key, {
      baseURL: this.params.baseURL as string,
      ...config,
      query,
      interceptors: this.interceptors,
      offline: this.params.offline
    }, options)
  }

  get<DataT, ErrorT = Error | null> (
    url: string,
    config: HTTPConfig & { key?: string } = {},
    options?: AsyncDataOptions<DataT>
  ) {
    return this.http<DataT, ErrorT>(url, { ...config, method: 'GET' }, options)
  }

  post<DataT, ErrorT = Error | null> (
    url: string,
    config: HTTPConfig & { key?: string } = {},
    options?: AsyncDataOptions<DataT>
  ) {
    return this.http<DataT, ErrorT>(url, { ...config, method: 'POST' }, options)
  }
}
