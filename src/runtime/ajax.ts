import type { Ref } from '#imports'
import type { NitroFetchRequest } from 'nitro/types'
import type { AsyncData, AsyncDataOptions, AsyncDataRequestStatus, NuxtError } from 'nuxt/app'
import type { CustomFetchOptions, FetchContext, FetchMethod, FetchResponse, Interceptors, KeysOf, PickFrom } from './type'
// @ts-expect-error virtual file
import { asyncDataDefaults, pendingWhenIdle } from '#build/nuxt.config.mjs'
import { clearNuxtData, computed, createError, getCurrentScope, onScopeDispose, reactive, ref, shallowRef, toValue, unref, useAsyncData, useNuxtApp, useRequestFetch, useRuntimeConfig, watch } from '#imports'
import { hash, serialize } from 'ohash'
import { generateOptionSegments, Noop, pick } from './utils'

type CustomFetchReturnValue<DataT, NuxtErrorDataT> = AsyncData<PickFrom<DataT, KeysOf<DataT>> | undefined, (NuxtErrorDataT extends Error | NuxtError<unknown> ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined>
type AsyncDataRefreshCause = 'initial' | 'refresh:hook' | 'refresh:manual' | 'watch'
interface AsyncDataExecuteOptions {
  /**
   * Force a refresh, even if there is already a pending request. Previous requests will
   * not be cancelled, but their result will not affect the data/pending state - and any
   * previously awaited promises will not resolve until this new request resolves.
   */
  dedupe?: 'cancel' | 'defer'

  cause?: AsyncDataRefreshCause
}

const _cachedController = new Map<string, AbortController>()

export class CustomFetch {
  baseURL
  immutableKey = false
  _config: CustomFetchOptions = {}
  _baseHandler: CustomFetchOptions['handler']
  _interceptors: Interceptors = {}
  offline = Noop
  showLogs = false
  constructor (config: CustomFetchOptions) {
    const { handler, offline, ...restConfig } = config
    this._config = restConfig
    this.baseURL = config.baseURL || ''
    this.immutableKey = config.immutableKey ?? false

    this.showLogs = config.showLogs ?? import.meta.dev ?? false

    if (handler) {
      this._baseHandler = handler || Noop
    }

    if (offline) {
      this.offline = offline
    }

    this._interceptors = {
      onRequest: config.onRequest || Noop,
      onRequestError: config.onRequestError || Noop,
      onResponse: config.onResponse || Noop,
      onResponseError: config.onResponseError || Noop
    }
  }

  private baseConfig (config: CustomFetchOptions): CustomFetchOptions {
    const { useHandler = true, handler, query = {}, params = {} } = config
    const baseHandler = handler || this._baseHandler
    const _name = Object.keys(query).length ? 'query' : 'params'
    const mergeObj = {
      ...params,
      ...query
    }
    if (useHandler && baseHandler && typeof baseHandler === 'function') {
      return { [_name]: baseHandler(mergeObj) }
    }

    return { [_name]: { ...mergeObj } }
  }

  request<DataT, NuxtErrorDataT = Error | null>(url: NitroFetchRequest, config: CustomFetchOptions & { method: FetchMethod }, options: AsyncDataOptions<DataT> = {}): CustomFetchReturnValue<DataT, NuxtErrorDataT> {
    const app = useRuntimeConfig().app
    config.baseURL ??= this.baseURL || app.baseURL
    Object.assign(config, this.baseConfig(config))

    const generateOptionSegmentsWithConfig = generateOptionSegments(config)
    if (this.showLogs && import.meta.client) {
      const { body: _body, ...resetConfig } = config

      let bodyLogs
      try {
        bodyLogs = serialize(_body)
      }
      catch (error) {
        console.warn('[Custom Fetch] couldn\'t serialize [Body]:', error)
      }
      console.warn([
        '———————————— [Custom Fetch] ————————————',
        `[Request URL]: ${url}`,
        '',
        `[Query]: ${serialize(resetConfig)}`,
        '',
        `[Body]: ${bodyLogs}`,
        '————————————————————————————————————'
      ].join('\n'))
    }
    const { onRequest, onRequestError, onResponse, onResponseError, offline, handler, useHandler, showLogs, immutableKey, ...asyncDataOptions } = config

    if (import.meta.client && navigator && !navigator.onLine) {
      this.offline()
    }

    const interceptors = this._interceptors
    const _config = reactive({ ...asyncDataOptions })

    const defaultOptions = {
      async onRequest (ctx: FetchContext) {
        const allFns = [interceptors.onRequest, onRequest].flat()
        for (const fn of allFns) {
          if (fn) {
            await fn(ctx)
          }
        }
      },
      async onRequestError (ctx: FetchContext & { error: Error }) {
        const allFns = [interceptors.onRequestError, onRequestError].flat()
        for (const fn of allFns) {
          if (fn) {
            await fn(ctx)
          }
        }
      },
      async onResponse (ctx: FetchContext & { response: FetchResponse<any> }) {
        const allFns = [interceptors.onResponse, onResponse].flat()
        for (const fn of allFns) {
          if (fn) {
            await fn(ctx)
          }
        }
      },
      async onResponseError (ctx: FetchContext & { response: FetchResponse<any> }) {
        const allFns = [interceptors.onResponseError, onResponseError].flat()
        for (const fn of allFns) {
          if (fn) {
            await fn(ctx)
          }
        }
      }
    }

    const hashValue: Array<string | undefined | Record<string, string>> = ['custom_fetch:', url as string]
    if (import.meta.dev && !config.key && (this.immutableKey || immutableKey)) {
      console.warn('[Custom Fetch] immutableKey is enabled, the key will be generated by hash([custom_fetch:, url])')
    }

    if (!this.immutableKey && !immutableKey) {
      hashValue.push(...generateOptionSegmentsWithConfig)
    }

    const hashKey = hash(hashValue).replace(/[-_]/g, '').slice(0, 10)

    const key = computed(() => toValue(config.key) || hashKey)

    watch(key, (key, oldKey) => {
      if (oldKey) {
        _cachedController.get(oldKey)?.abort?.()
        _cachedController.delete(oldKey)
      }
      else {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : ({} as AbortController)
        _cachedController.set(key, controller)
      }
    })

    const _handler = () => {
      if (_cachedController.get(key.value)) {
        _cachedController.get(key.value)?.abort?.()
      }

      return useRequestFetch()(url as string, {
        signal: _cachedController.get(key.value)?.signal,
        ...defaultOptions,
        ..._config
      }) as unknown as Promise<DataT>
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : ({} as AbortController)

    const nuxtApp = useNuxtApp()
    if (import.meta.client && !nuxtApp.isHydrating) {
      // If server instance is exist, at client use same
      if (nuxtApp._asyncData[key.value]?._deps) {
        nuxtApp._asyncData[key.value]!.execute({
          cause: 'initial',
          dedupe: options.dedupe
        })
        return nuxtApp._asyncData[key.value] as any
      }
      /**
       * WRAN: At client its only for compat data. The behavior is not same as useAsyncData
       * And client not has cachedData
       */
      const _ref = options.deep ? ref : shallowRef

      options.default ??= () => asyncDataDefaults.value as any

      const asyncData: {
        data: Ref<any>
        error: Ref<(NuxtErrorDataT extends Error | NuxtError<unknown> ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined>
        pending: Ref<boolean>
        status: Ref<AsyncDataRequestStatus>
        refresh?: (opts?: AsyncDataExecuteOptions) => Promise<DataT | void>
        execute?: (opts?: AsyncDataExecuteOptions) => Promise<DataT | void>
        clear: () => void
      } = {
        data: _ref(undefined),
        error: _ref(undefined),
        status: _ref('idle'),
        pending: _ref(false),
        clear: () => clearNuxtData(key.value)
      }
      if (pendingWhenIdle) {
        asyncData.pending.value = true
      }
      asyncData.status.value = 'pending'
      const promise = new Promise<DataT>((resolve, reject) => {
        try {
          resolve(_handler())
          _cachedController.set(key.value, controller)
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
          asyncData.error.value = asyncDataDefaults.errorValue
          asyncData.status.value = 'success'
          return asyncData
        })
        .catch((error: any) => {
          asyncData.error.value = createError(error) as any
          asyncData.data.value = unref(options.default!())
          asyncData.status.value = 'error'
          return asyncData
        })
        .finally(() => {
          if (pendingWhenIdle) {
            asyncData.pending.value = false
          }
          _cachedController.delete(key.value)
        })

      asyncData.refresh = asyncData.execute = () => _handler().then(result => asyncData.data.value = result)

      const hasScope = getCurrentScope()
      if (options.watch) {
        const unsub = watch(options.watch, async () => {
          asyncData.refresh!()
        }, { flush: 'post' })
        if (hasScope) {
          onScopeDispose(unsub)
        }
      }

      return promise as any
    }

    return useAsyncData<DataT, NuxtErrorDataT>(key, _handler, options) as CustomFetchReturnValue<DataT, NuxtErrorDataT>
  }

  get<DataT, NuxtErrorDataT = Error | null>(url: NitroFetchRequest, config: CustomFetchOptions = {}, options?: AsyncDataOptions<DataT>) {
    return this.request<DataT, NuxtErrorDataT>(url, {
      ...config,
      method: 'GET'
    }, options)
  }

  post<DataT, NuxtErrorDataT = Error | null>(url: NitroFetchRequest, config: CustomFetchOptions = {}, options?: AsyncDataOptions<DataT>) {
    return this.request<DataT, NuxtErrorDataT>(url, {
      ...config,
      method: 'POST'
    }, options)
  }
}
