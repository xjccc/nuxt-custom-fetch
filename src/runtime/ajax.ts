import { hash } from 'ohash'
import type { NitroFetchRequest } from 'nitropack'
import type { AsyncData, AsyncDataOptions, AsyncDataRequestStatus, NuxtError } from 'nuxt/app'
import type {
  HTTPConfig,
  Interceptors,
  OnRequestErrorType,
  OnRequestType,
  OnResponseErrorType,
  OnResponseType,
  FetchMethod,
  KeysOf,
  PickFrom
} from './type'
import { createError, ref, toValue, unref, useAsyncData, useNuxtApp, type MaybeRef, type Ref } from '#imports'

type CustomFetchReturnValue<DataT, ErrorT> = AsyncData<
  PickFrom<DataT, KeysOf<DataT>> | null,
  | (ErrorT extends Error | NuxtError<unknown> ? ErrorT : NuxtError<ErrorT>)
  | null
>;

const Noop = () => {}
function generateOptionSegments (opts: HTTPConfig & { method: FetchMethod }) {
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
function pick (obj: Record<string, any>, keys: string[]) {
  const newObj = {}
  for (const key of keys) {
    (newObj as any)[key] = obj[key]
  }
  return newObj
}

const _cachedController = new Map<string, AbortController>()

export class CustomFetch {
  baseURL
  params: HTTPConfig = {}
  baseHandler: HTTPConfig['handler']
  interceptors: Interceptors = {}
  offline = Noop

  constructor (config: HTTPConfig = { baseURL: '' }) {
    this.params = {
      ...config
    }
    this.baseURL = config.baseURL

    if (config.handler) {
      this.baseHandler = config.handler
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
    const { useHandler = true, handler, query = {}, params = {} } = config
    const baseHandler = handler || this.baseHandler
    const mergeObj = { ...params, ...query }
    if (useHandler && baseHandler && typeof baseHandler === 'function') {
      return baseHandler({ ...mergeObj })
    }
    return { ...mergeObj }
  }

  http<DataT, ErrorT = Error | null> (
    url: NitroFetchRequest,
    config: HTTPConfig & { method: FetchMethod },
    options?: AsyncDataOptions<DataT>
  ): CustomFetchReturnValue<DataT, ErrorT> {
    config.baseURL = config?.baseURL || this.baseURL
    config.query = this.baseConfig(config)
    if (process.client && navigator && !navigator.onLine) {
      config.offline && config.offline()
    }
    const interceptors = this.interceptors
    const {
      onRequest,
      onRequestError,
      onResponse,
      onResponseError,
      offline,
      ...restAjaxConfig
    } = config
    const defaultOptions = {
      onRequest (ctx: OnRequestType) {
        [interceptors.onRequest, onRequest].map(fn => fn && fn(ctx))
      },
      onRequestError (ctx: OnRequestErrorType) {
        [interceptors.onRequestError, onRequestError].map(
          fn => fn && fn(ctx)
        )
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
    const key = hash(['custom|', url, ...generateOptionSegments(config)])

    const handler = () => {
      if (_cachedController.get(key)) {
        _cachedController.get(key)?.abort?.()
      }
      return $fetch(url as string, {
        signal: _cachedController.get(key)?.signal,
        ...defaultOptions,
        ...restAjaxConfig
      }) as unknown as Promise<DataT>
    }

    const nuxtApp = useNuxtApp()
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : {} as AbortController

    if (import.meta.client && !nuxtApp.isHydrating) {
      const asyncData: {
        data: Ref<any>
        pending: Ref<boolean>
        error: Ref<(ErrorT extends Error | NuxtError<unknown> ? ErrorT : NuxtError<ErrorT>) | null>
        status: Ref<AsyncDataRequestStatus>
      } = {
        data: ref(null),
        pending: ref(true),
        error: ref(null),
        status: ref('idle')
      }

      asyncData.pending.value = true
      asyncData.status.value = 'pending'
      const promise = new Promise<DataT>((resolve, reject) => {
        try {
          resolve(handler())
          _cachedController.set(key, controller)
        } catch (err) {
          reject(err)
        }
      }).then(async (_result) => {
        let result = _result as unknown as DataT
        if (options?.transform) {
          result = await options.transform(_result)
        }
        if (options?.pick) {
          result = pick(result as any, options.pick) as DataT
        }

        asyncData.data.value = result
        asyncData.error.value = null
        asyncData.status.value = 'success'
        return asyncData
      })
        .catch((error: any) => {
          asyncData.error.value = createError(error) as any
          asyncData.data.value = unref(options?.default!())
          asyncData.status.value = 'error'
          return asyncData
        })
        .finally(() => {
          asyncData.pending.value = false
          _cachedController.delete(key)
        })
      return promise as any
    }
    if (!config.key) {
      return useAsyncData<DataT, ErrorT>(handler, options)
    }
    return useAsyncData<DataT, ErrorT>(config.key, handler, options)
  }

  get<DataT, ErrorT = Error | null> (
    url: NitroFetchRequest,
    config: HTTPConfig = {},
    options?: AsyncDataOptions<DataT>
  ) {
    return this.http<DataT, ErrorT>(url, { ...config, method: 'GET' }, options)
  }

  post<DataT, ErrorT = Error | null> (
    url: NitroFetchRequest,
    config: HTTPConfig = {},
    options?: AsyncDataOptions<DataT>
  ) {
    return this.http<DataT, ErrorT>(
      url,
      { ...config, method: 'POST' },
      options
    )
  }
}
