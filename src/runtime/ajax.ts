import { hash } from 'ohash'
import type { NitroFetchRequest } from 'nitropack'
import type { AsyncData, AsyncDataOptions, AsyncDataRequestStatus, NuxtError } from 'nuxt/app'
import type { FetchMethod, HTTPConfig, Interceptors, KeysOf, OnRequestErrorType, OnRequestType, OnResponseErrorType, OnResponseType, PickFrom } from './type'
import { type MaybeRef, type Ref, createError, reactive, ref, toValue, unref, useAsyncData, useNuxtApp } from '#imports'

type CustomFetchReturnValue<DataT, ErrorT> = AsyncData<PickFrom<DataT, KeysOf<DataT>> | null, (ErrorT extends Error | NuxtError<unknown> ? ErrorT : NuxtError<ErrorT>) | null>

function Noop () {}
function generateOptionSegments (opts: HTTPConfig & { method: FetchMethod }) {
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
  return segments
}
function pick (obj: Record<string, any>, keys: string[]) {
  const newObj: any = {}
  for (const key of keys) {
    newObj[key] = obj[key]
  }

  return newObj
}

const _cachedController = new Map<string, AbortController>()

export class CustomFetch {
  baseURL
  immutableKey = false
  params: HTTPConfig = {}
  baseHandler: HTTPConfig['handler']
  interceptors: Interceptors = {}
  offline = Noop

  constructor (config: HTTPConfig = { baseURL: '' }) {
    this.params = { ...config }
    this.baseURL = config.baseURL
    this.immutableKey = config.immutableKey ?? false

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
    const _name = Object.keys(query).length ? 'query' : 'params'
    const mergeObj = {
      ...query,
      ...params
    }
    if (useHandler && baseHandler && typeof baseHandler === 'function') {
      return { [_name]: baseHandler(mergeObj) }
    }

    return { [_name]: { ...mergeObj } }
  }

  http<DataT, ErrorT = Error | null> (url: NitroFetchRequest, config: HTTPConfig & { method: FetchMethod }, options: AsyncDataOptions<DataT> = {}): CustomFetchReturnValue<DataT, ErrorT> {
    config.baseURL = config?.baseURL || this.baseURL
    Object.assign(config, this.baseConfig(config))

    const { onRequest, onRequestError, onResponse, onResponseError, offline, handler, useHandler, immutableKey, ...restAjaxConfig } = config

    if (process.client && navigator && !navigator.onLine) {
      if (offline) {
        offline()
      }
    }

    const interceptors = this.interceptors
    const _config = reactive({ ...restAjaxConfig })

    const defaultOptions = {
      onRequest (ctx: OnRequestType) {
        [interceptors.onRequest, onRequest].forEach(fn => fn?.(ctx))
      },
      onRequestError (ctx: OnRequestErrorType) {
        [interceptors.onRequestError, onRequestError].forEach(fn => fn?.(ctx))

        throw createError({
          statusCode: ctx.error.statusCode,
          statusMessage: ctx.error.message,
          message: ctx.error.message,
          fatal: true
        })
      },
      onResponse (ctx: OnResponseType) {
        if (interceptors.onResponse) {
          interceptors.onResponse(ctx)
        }
        if (onResponse) {
          onResponse(ctx)
        }
      },
      onResponseError (ctx: OnResponseErrorType) {
        [interceptors.onResponseError, onResponseError].forEach(fn => fn?.(ctx))
        throw createError({
          statusCode: ctx.response.status,
          statusMessage: ctx.request.toString(),
          message: ctx.response._data,
          fatal: true
        })
      }
    }

    const hashValue: Array<string | undefined | Record<string, string>> = ['custom|', url as string]
    if (!this.immutableKey && !immutableKey) {
      hashValue.push(...generateOptionSegments(config))
    }

    const key = hash(hashValue)

    options.default = options.default ?? (() => null)

    const _handler = () => {
      if (_cachedController.get(key)) {
        _cachedController.get(key)?.abort?.()
      }

      return $fetch(url as string, {
        signal: _cachedController.get(key)?.signal,
        ...defaultOptions,
        ..._config
      }) as unknown as Promise<DataT>
    }

    const nuxtApp = useNuxtApp()
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : ({} as AbortController)

    // const instance = getCurrentInstance()
    // if (import.meta.client && !nuxtApp.isHydrating && (!instance || instance?.isMounted)) {
    if (import.meta.client && !nuxtApp.isHydrating) {
      const asyncData: {
        data: Ref<any>
        /**
         * @deprecated This may be removed in a future major version.
         */
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
          resolve(_handler())
          _cachedController.set(key, controller)
        }
        catch (err) {
          reject(err)
        }
      })
        .then(async (_result) => {
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

    return useAsyncData<DataT, ErrorT>(config.key || key, _handler, options)
  }

  get<DataT, ErrorT = Error | null> (url: NitroFetchRequest, config: HTTPConfig = {}, options?: AsyncDataOptions<DataT>) {
    return this.http<DataT, ErrorT>(url, {
      ...config,
      method: 'GET'
    }, options)
  }

  post<DataT, ErrorT = Error | null> (url: NitroFetchRequest, config: HTTPConfig = {}, options?: AsyncDataOptions<DataT>) {
    return this.http<DataT, ErrorT>(url, {
      ...config,
      method: 'POST'
    }, options)
  }
}
