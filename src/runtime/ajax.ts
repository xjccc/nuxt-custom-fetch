import type { MaybeRef, Ref } from '#imports'
import type { NitroFetchRequest } from 'nitro'
import type { AsyncData, AsyncDataOptions, AsyncDataRequestStatus, NuxtError } from 'nuxt/app'
import type { FetchContext, FetchMethod, FetchResponse, HTTPConfig, Interceptors, KeysOf, PickFrom } from './type'
import { createError, getCurrentScope, onScopeDispose, reactive, ref, toValue, unref, useAsyncData, useNuxtApp, useRequestFetch, watch } from '#imports'
import { hash, serialize } from 'ohash'

type CustomFetchReturnValue<DataT, ErrorT> = AsyncData<PickFrom<DataT, KeysOf<DataT>> | null, (ErrorT extends Error | NuxtError<unknown> ? ErrorT : NuxtError<ErrorT>) | null>

function Noop () { }
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
  showLogs = false

  constructor (config: HTTPConfig = {
    baseURL: ''
  }) {
    this.params = { ...config }
    this.baseURL = config.baseURL
    this.immutableKey = config.immutableKey ?? false

    this.showLogs = config.showLogs ?? import.meta.dev

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

  http<DataT, ErrorT = Error | null>(url: NitroFetchRequest, config: HTTPConfig & { method: FetchMethod }, options: AsyncDataOptions<DataT> = {}): CustomFetchReturnValue<DataT, ErrorT> {
    config.baseURL = config?.baseURL || this.baseURL
    Object.assign(config, this.baseConfig(config))
    const generateOptionSegmentsWithConfig = generateOptionSegments(config)
    if (this.showLogs && import.meta.client) {
      console.warn('[Custom Fetch] \`Request:\`', url, ' \`Query:\`', serialize(generateOptionSegmentsWithConfig), ' \`Body:\`', serialize(config.body))
    }
    const { onRequest, onRequestError, onResponse, onResponseError, offline, handler, useHandler, immutableKey, ...restAjaxConfig } = config

    if (import.meta.client && navigator && !navigator.onLine) {
      if (offline) {
        offline()
      }
    }

    const interceptors = this.interceptors
    const _config = reactive({ ...restAjaxConfig })

    const defaultOptions = {
      onRequest (ctx: FetchContext) {
        [interceptors.onRequest, onRequest].forEach((fns) => {
          if (Array.isArray(fns)) {
            fns.forEach(fn => fn?.(ctx))
          }
          else {
            fns?.(ctx)
          }
        })
      },
      onRequestError (ctx: FetchContext & { error: Error }) {
        [interceptors.onRequestError, onRequestError].forEach((fns) => {
          if (Array.isArray(fns)) {
            fns.forEach(fn => fn?.(ctx))
          }
          else {
            fns?.(ctx)
          }
        })

        throw createError({
          statusCode: 400,
          statusMessage: ctx.error.message,
          message: ctx.error.message,
          fatal: true
        })
      },
      onResponse (ctx: FetchContext & { response: FetchResponse<any> }) {
        [interceptors.onResponse, onResponse].forEach((fns) => {
          if (Array.isArray(fns)) {
            fns.forEach(fn => fn?.(ctx))
          }
          else {
            fns?.(ctx)
          }
        })
      },
      onResponseError (ctx: FetchContext & { response: FetchResponse<any> }) {
        [interceptors.onResponseError, onResponseError].forEach((fns) => {
          if (Array.isArray(fns)) {
            fns.forEach(fn => fn?.(ctx))
          }
          else {
            fns?.(ctx)
          }
        })
        throw createError({
          statusCode: 500,
          statusMessage: ctx.request.toString(),
          message: ctx.response._data,
          fatal: true
        })
      }
    }

    const hashValue: Array<string | undefined | Record<string, string>> = ['custom_fetch:', url as string]
    if (!this.immutableKey && !immutableKey) {
      hashValue.push(...generateOptionSegmentsWithConfig)
    }

    const key = hash(hashValue).replace(/[-_]/g, '').slice(0, 10)

    options.default = options.default ?? (() => null)

    const _handler = () => {
      if (_cachedController.get(key)) {
        _cachedController.get(key)?.abort?.()
      }

      return useRequestFetch()(url as string, {
        signal: _cachedController.get(key)?.signal,
        ...defaultOptions,
        ..._config
      }) as unknown as Promise<DataT>
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : ({} as AbortController)
    const nuxtApp = useNuxtApp()

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
        refresh?: () => Promise<DataT>
        execute?: () => Promise<DataT>
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

      asyncData.refresh = asyncData.execute = () => _handler().then(result => asyncData.data.value = result)
      const hasScope = getCurrentScope()
      if (options.watch) {
        const unsub = watch(options.watch, async () => {
          asyncData.refresh!()
        })
        if (hasScope) {
          onScopeDispose(unsub)
        }
      }

      return promise as any
    }

    return useAsyncData<DataT, ErrorT>(config.key || key, _handler, options)
  }

  get<DataT, ErrorT = Error | null>(url: NitroFetchRequest, config: HTTPConfig = {}, options?: AsyncDataOptions<DataT>) {
    return this.http<DataT, ErrorT>(url, {
      ...config,
      method: 'GET'
    }, options)
  }

  post<DataT, ErrorT = Error | null>(url: NitroFetchRequest, config: HTTPConfig = {}, options?: AsyncDataOptions<DataT>) {
    return this.http<DataT, ErrorT>(url, {
      ...config,
      method: 'POST'
    }, options)
  }
}
