import { hash } from 'ohash'
import { createError } from 'h3'
import type {
  AsyncData,
  AsyncDataOptions,
  NuxtError
} from 'nuxt/app'
import type {
  HTTPConfig,
  Interceptors,
  OnRequestErrorType,
  OnRequestType,
  OnResponseErrorType,
  OnResponseType,
  AjaxConfig,
  FetchMethod,
  KeysOf,
  PickFrom
} from './type'
import { toValue, useAsyncData, type MaybeRef } from '#imports'

export const ajax = <DataT, ErrorT = Error | null>(
  url: string,
  key: string,
  config: AjaxConfig,
  options?: AsyncDataOptions<DataT>
): AsyncData<
  PickFrom<DataT, KeysOf<DataT>> | null,
  | (ErrorT extends Error | NuxtError<unknown> ? ErrorT : NuxtError<ErrorT>)
  | null
> => {
  if (process.client && navigator && !navigator.onLine) {
    config.offline && config.offline()
  }

  const {
    onRequest,
    onRequestError,
    onResponse,
    onResponseError,
    interceptors,
    ...restAjaxConfig
  } = config
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
      [interceptors.onResponseError, onResponseError].map(
        fn => fn && fn(ctx)
      )
      throw createError({
        statusCode: ctx.response.status,
        statusMessage: ctx.request.toString(),
        message: ctx.response._data,
        fatal: true
      })
    }
  }

  return useAsyncData<DataT, ErrorT>(
    key,
    () =>
      $fetch(url, {
        ...defaultOptions,
        ...restAjaxConfig,
        method: restAjaxConfig.method as FetchMethod
      }),
    options
  )
}
function generateOptionSegments (opts: HTTPConfig) {
  const segments: Array<string | undefined | Record<string, string>> = [
    toValue(opts.method as MaybeRef<string | undefined> | undefined)?.toUpperCase() || 'GET',
    toValue(opts.baseURL)
  ]
  for (const _obj of [opts.params || opts.query]) {
    const obj = toValue(_obj)
    if (!obj) { continue }

    const unwrapped: Record<string, string> = {}
    for (const [key, value] of Object.entries(obj)) {
      unwrapped[toValue(key)] = toValue(value)
    }
    segments.push(unwrapped)
  }
  return segments
}

const Noop = () => {}
export class CustomFetch {
  baseURL
  params: HTTPConfig = {}
  baseParamsHandler: HTTPConfig['paramsHandler']
  interceptors: Interceptors = {}
  offline = Noop

  constructor (config: HTTPConfig = { baseURL: '' }) {
    this.params = {
      ...config
    }
    this.baseURL = config.baseURL

    if (config.paramsHandler) {
      this.baseParamsHandler = config.paramsHandler
    }
    this.offline = config?.offline || Noop

    this.interceptors = {
      onRequest: config.onRequest || Noop,
      onRequestError: config.onRequestError || Noop,
      onResponse: config.onResponse || Noop,
      onResponseError: config.onResponseError || Noop
    }
  }

  private baseConfig (config: HTTPConfig): HTTPConfig {
    const { useParamsHandler = true, paramsHandler } = config
    const handler = paramsHandler || this.baseParamsHandler
    const params = (config.query ? config.query : config.params) || {}

    if (useParamsHandler && handler && typeof handler === 'function') {
      delete config.params
      delete config.query
      return handler({ ...params })
    }
    return { ...params }
  }

  http<DataT, ErrorT = Error | null> (
    url: string,
    config: HTTPConfig & { key?: string } = {},
    options?: AsyncDataOptions<DataT>
  ) {
    const key = config.key
      ? config.key
      : hash([url, ...generateOptionSegments(config)])
    const baseURL = config?.baseURL || this.baseURL
    const query = this.baseConfig(config)
    const offline = config?.offline || this.offline
    return ajax<DataT, ErrorT>(
      url,
      key,
      {
        baseURL,
        ...config,
        query,
        interceptors: this.interceptors,
        offline
      },
      options
    )
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
    return this.http<DataT, ErrorT>(
      url,
      { ...config, method: 'POST' },
      options
    )
  }
}
