import type { Ref } from '#imports'
import type { NitroFetchRequest } from 'nitro/types'
import type { AsyncData, AsyncDataOptions, NuxtError } from 'nuxt/app'
import type { CustomFetchOptions, CustomFetchRequestOptions, FetchContext, FetchResponse, Interceptors, KeysOf, PickFrom, ResolvedCustomFetchOptions } from './type'
// @ts-expect-error virtual file
import { asyncDataDefaults } from '#build/nuxt.config.mjs'
import { clearNuxtData, computed, createError, getCurrentScope, onScopeDispose, reactive, ref, shallowRef, toValue, unref, useAsyncData, useNuxtApp, useRequestFetch, useRuntimeConfig, watch } from '#imports'
import { hash, serialize } from 'ohash'
import { generateOptionSegments, Noop, pick, resolveReactiveValue } from './utils'

type CustomFetchData<DataT, PickKeys extends KeysOf<DataT>, DefaultT> = DefaultT | PickFrom<DataT, PickKeys>
type CustomFetchError<NuxtErrorDataT>
  = (NuxtErrorDataT extends Error | NuxtError<unknown> ? NuxtErrorDataT : NuxtError<NuxtErrorDataT>) | undefined
type CustomFetchAsyncData<DataT, PickKeys extends KeysOf<DataT>, DefaultT, NuxtErrorDataT>
  = AsyncData<CustomFetchData<DataT, PickKeys, DefaultT>, CustomFetchError<NuxtErrorDataT>>
type CustomFetchAsyncDataState<DataT, PickKeys extends KeysOf<DataT>, DefaultT, NuxtErrorDataT>
  = Awaited<CustomFetchAsyncData<DataT, PickKeys, DefaultT, NuxtErrorDataT>>
type CustomFetchReturnValue<DataT, PickKeys extends KeysOf<DataT>, DefaultT, NuxtErrorDataT>
  = CustomFetchAsyncData<DataT, PickKeys, DefaultT, NuxtErrorDataT>
type AsyncDataRefreshCause = 'initial' | 'refresh:hook' | 'refresh:manual' | 'watch'
interface AsyncDataExecuteOptions {
  dedupe?: 'cancel' | 'defer'
  cause?: AsyncDataRefreshCause
  timeout?: number
  signal?: AbortSignal
}

interface RuntimeConfigWithApp {
  app?: {
    baseURL?: string
  }
}

interface NuxtAppWithAsyncData {
  isHydrating?: boolean
  _asyncData?: Record<string, {
    _deps?: number
    execute?: (opts?: AsyncDataExecuteOptions) => Promise<unknown>
  } | undefined>
}

interface ClientAsyncDataEntry {
  clear: () => void
  data: Ref<unknown>
  error: Ref<unknown>
  execute: (opts?: AsyncDataExecuteOptions) => Promise<void>
  pending: Ref<boolean>
  refresh: (opts?: AsyncDataExecuteOptions) => Promise<void>
  status: Ref<'idle' | 'pending' | 'success' | 'error'>
}

type RequestFetchOptions = Omit<CustomFetchRequestOptions, 'key' | 'immutableKey' | 'showLogs' | 'useHandler' | 'handler' | 'offline'>
type ResolvedRequestFetchOptions = ResolvedCustomFetchOptions & {
  timeout?: number
}

const _cachedController = new Map<string, AbortController>()
const _cachedClientAsyncData = new Map<string, ClientAsyncDataEntry>()
const REPLACE_REG = /[-_]/g
const FALLBACK_TO_CLIENT_ASYNC_DATA_RE = /component is already mounted|outside of a plugin|outside of a nuxt instance|requires access to the nuxt instance/i

function createAbortController () {
  return typeof AbortController !== 'undefined' ? new AbortController() : undefined
}

function linkAbortSignal (signal: AbortSignal | undefined, controller: AbortController | undefined) {
  if (!signal || !controller) {
    return
  }

  if (signal.aborted) {
    controller.abort()
    return
  }

  signal.addEventListener('abort', () => controller.abort(), { once: true })
}

function shouldFallbackToClientAsyncData (error: unknown) {
  return error instanceof Error && FALLBACK_TO_CLIENT_ASYNC_DATA_RE.test(error.message)
}

function resolveFetchConfig (config: RequestFetchOptions, timeout?: number): ResolvedRequestFetchOptions {
  const baseURL = toValue(config.baseURL)
  const body = resolveReactiveValue<ResolvedRequestFetchOptions['body']>(toValue(config.body))
  const cache = toValue(config.cache)
  const headers = resolveReactiveValue<ResolvedRequestFetchOptions['headers']>(toValue(config.headers))
  const method = toValue(config.method)
  const params = resolveReactiveValue<ResolvedRequestFetchOptions['params']>(toValue(config.params))
  const query = resolveReactiveValue<ResolvedRequestFetchOptions['query']>(toValue(config.query))

  return {
    ...config,
    baseURL,
    body,
    cache,
    headers,
    method,
    params,
    query,
    timeout
  }
}

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

  request<ResT, NuxtErrorDataT = Error | null, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = undefined>(
    url: NitroFetchRequest,
    config: CustomFetchRequestOptions,
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
  request<ResT, NuxtErrorDataT = Error | null, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = DataT>(
    url: NitroFetchRequest,
    config: CustomFetchRequestOptions,
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
  request<ResT, NuxtErrorDataT = Error | null, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = undefined>(
    url: NitroFetchRequest,
    config: CustomFetchRequestOptions,
    options: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT> = {}
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT> {
    const runtimeConfig = useRuntimeConfig() as RuntimeConfigWithApp
    const resolvedConfig: CustomFetchRequestOptions = {
      ...config,
      baseURL: config.baseURL ?? (this.baseURL || runtimeConfig.app?.baseURL || '')
    }
    Object.assign(resolvedConfig, this.baseConfig(resolvedConfig))

    const generateOptionSegmentsWithConfig = generateOptionSegments(resolvedConfig)
    if (import.meta.dev && import.meta.client && this.showLogs) {
      const logConfig = Object.fromEntries(Object.entries({
        baseURL: toValue(resolvedConfig.baseURL),
        cache: toValue(resolvedConfig.cache),
        headers: resolveReactiveValue(toValue(resolvedConfig.headers)),
        key: toValue(resolvedConfig.key),
        method: toValue(resolvedConfig.method),
        params: resolveReactiveValue(toValue(resolvedConfig.params)),
        query: resolveReactiveValue(toValue(resolvedConfig.query))
      }).filter(([, value]) => value !== undefined))

      let bodyLogs
      try {
        bodyLogs = serialize(resolveReactiveValue(toValue(resolvedConfig.body)))
      }
      catch (error) {
        console.warn('[Custom Fetch] couldn\'t serialize [Body]:', error)
      }
      console.warn([
        '———————————— [Custom Fetch] ————————————',
        `[Request URL]: ${url}`,
        '',
        `[Query]: ${serialize(logConfig)}`,
        '',
        `[Body]: ${bodyLogs}`,
        '————————————————————————————————————'
      ].join('\n'))
    }
    const {
      immutableKey,
      key: _key,
      offline: _offline,
      handler: _handlerConfig,
      onRequest,
      onRequestError,
      onResponse,
      onResponseError,
      showLogs: _showLogs,
      useHandler: _useHandler,
      ...fetchConfig
    } = resolvedConfig

    if (import.meta.client && navigator && !navigator.onLine) {
      this.offline()
    }

    const interceptors = this._interceptors
    const requestFetch = useRequestFetch()
    const _config: RequestFetchOptions = reactive({ ...fetchConfig })

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

    const hashValue: Array<string | undefined | Record<string, unknown>> = ['custom_fetch:', url as string]
    if (import.meta.dev && !config.key && (this.immutableKey || immutableKey)) {
      console.warn('[Custom Fetch] immutableKey is enabled, the key will be generated by hash([custom_fetch:, url])')
    }

    if (!this.immutableKey && !immutableKey) {
      hashValue.push(...generateOptionSegmentsWithConfig)
    }

    const hashKey = hash(hashValue).replace(REPLACE_REG, '').slice(0, 10)

    const key = computed(() => toValue(resolvedConfig.key) || hashKey)

    const executeRequest = (executeOptions: AsyncDataExecuteOptions = {}) => {
      const controller = createAbortController()
      linkAbortSignal(executeOptions.signal, controller)

      return requestFetch(url as string, {
        ...defaultOptions,
        ...resolveFetchConfig(_config, executeOptions.timeout ?? options.timeout),
        signal: controller?.signal
      }) as unknown as Promise<ResT>
    }

    const _handler = (_nuxtApp: unknown, context: { signal: AbortSignal }) => {
      return executeRequest({
        signal: context.signal,
        timeout: options.timeout
      })
    }

    const createClientAsyncDataFallback = (): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT> => {
      const _ref = options.deep ? ref : shallowRef
      const getDefaultValue = () => {
        if (options.default) {
          return unref(options.default()) as CustomFetchData<DataT, PickKeys, DefaultT>
        }

        return asyncDataDefaults.value as CustomFetchData<DataT, PickKeys, DefaultT>
      }

      let activeController: AbortController | undefined
      let activeRequest: Promise<void> | undefined
      let requestId = 0

      const asyncData: CustomFetchAsyncDataState<DataT, PickKeys, DefaultT, NuxtErrorDataT> = {
        data: _ref(getDefaultValue()) as Ref<CustomFetchData<DataT, PickKeys, DefaultT>>,
        error: _ref(asyncDataDefaults.errorValue) as Ref<CustomFetchError<NuxtErrorDataT>>,
        status: _ref(options.immediate === false ? 'idle' : 'pending'),
        pending: _ref(options.immediate !== false),
        clear: () => {
          activeController?.abort()
          _cachedController.delete(key.value)
          if (_cachedClientAsyncData.get(key.value) === asyncData) {
            _cachedClientAsyncData.delete(key.value)
          }
          asyncData.data.value = getDefaultValue()
          asyncData.error.value = asyncDataDefaults.errorValue
          asyncData.status.value = 'idle'
          asyncData.pending.value = false
          clearNuxtData(key.value)
        },
        refresh: async (executeOptions?: AsyncDataExecuteOptions) => {
          await asyncData.execute(executeOptions)
        },
        execute: async (executeOptions?: AsyncDataExecuteOptions) => {
          const dedupe = executeOptions?.dedupe ?? options.dedupe ?? 'cancel'
          if (activeRequest) {
            if (dedupe === 'defer') {
              return activeRequest
            }

            activeController?.abort()
          }

          const currentRequestId = ++requestId
          const controller = createAbortController()
          activeController = controller
          linkAbortSignal(executeOptions?.signal, controller)

          if (controller) {
            _cachedController.set(key.value, controller)
          }

          asyncData.pending.value = true
          asyncData.status.value = 'pending'
          asyncData.error.value = asyncDataDefaults.errorValue

          activeRequest = executeRequest({
            ...executeOptions,
            signal: controller?.signal
          })
            .then(async (result) => {
              if (currentRequestId !== requestId) {
                return
              }

              let data = result as unknown as DataT
              if (options.transform) {
                data = await options.transform(result)
              }

              let finalData = data as PickFrom<DataT, PickKeys>
              if (options.pick) {
                finalData = pick(data as Record<string, any>, options.pick as string[]) as PickFrom<DataT, PickKeys>
              }

              asyncData.data.value = finalData as CustomFetchData<DataT, PickKeys, DefaultT>
              asyncData.error.value = asyncDataDefaults.errorValue
              asyncData.status.value = 'success'
            })
            .catch((error: any) => {
              if (currentRequestId !== requestId || controller?.signal.aborted) {
                return
              }

              asyncData.error.value = createError(error) as CustomFetchError<NuxtErrorDataT>
              asyncData.data.value = getDefaultValue()
              asyncData.status.value = 'error'
            })
            .finally(() => {
              if (currentRequestId !== requestId) {
                return
              }

              activeRequest = undefined
              activeController = undefined
              _cachedController.delete(key.value)

              if (asyncData.status.value === 'pending') {
                asyncData.status.value = 'idle'
              }

              asyncData.pending.value = false
            })

          await activeRequest
        }
      }

      _cachedClientAsyncData.set(key.value, asyncData as ClientAsyncDataEntry)

      watch(key, (newKey, oldKey) => {
        if (oldKey) {
          _cachedController.get(oldKey)?.abort?.()
          _cachedController.delete(oldKey)

          if (_cachedClientAsyncData.get(oldKey) === asyncData) {
            _cachedClientAsyncData.delete(oldKey)
          }
        }

        if (newKey !== oldKey) {
          _cachedClientAsyncData.set(newKey, asyncData as ClientAsyncDataEntry)
        }

        if (newKey !== oldKey && options.immediate !== false) {
          void asyncData.execute({ cause: 'watch' })
        }
      })

      const hasScope = getCurrentScope()
      if (options.watch) {
        const unsub = watch(options.watch, async () => {
          await asyncData.refresh({ cause: 'watch' })
        }, { flush: 'post' })
        if (hasScope) {
          onScopeDispose(unsub)
        }
      }

      if (options.immediate === false) {
        return Promise.resolve(asyncData) as CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
      }

      return asyncData.execute({ cause: 'initial' }).then(() => asyncData) as CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
    }

    const nuxtApp = useNuxtApp() as NuxtAppWithAsyncData
    const sharedAsyncData = nuxtApp._asyncData?.[key.value]
    const cachedClientAsyncData = _cachedClientAsyncData.get(key.value)

    if (import.meta.client && !nuxtApp.isHydrating) {
      if (sharedAsyncData?._deps && typeof sharedAsyncData.execute === 'function') {
        void sharedAsyncData.execute({
          cause: 'initial',
          dedupe: options.dedupe
        })

        return sharedAsyncData as CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
      }

      if (cachedClientAsyncData) {
        if (options.immediate === false) {
          return Promise.resolve(cachedClientAsyncData) as CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
        }

        return cachedClientAsyncData.execute({
          cause: 'initial',
          dedupe: options.dedupe
        }).then(() => cachedClientAsyncData) as CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
      }

      return createClientAsyncDataFallback()
    }

    try {
      return useAsyncData<ResT, NuxtErrorDataT, DataT, PickKeys, DefaultT>(key, _handler, options) as CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
    }
    catch (error) {
      if (!import.meta.client || !shouldFallbackToClientAsyncData(error)) {
        throw error
      }

      if (import.meta.dev) {
        console.warn('[Custom Fetch] Falling back to client compatibility mode outside setup-compatible async data context.')
      }

      return createClientAsyncDataFallback()
    }
  }

  get<ResT, NuxtErrorDataT = Error | null, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = undefined>(
    url: NitroFetchRequest,
    config?: CustomFetchOptions,
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
  get<ResT, NuxtErrorDataT = Error | null, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = DataT>(
    url: NitroFetchRequest,
    config?: CustomFetchOptions,
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
  get<ResT, NuxtErrorDataT = Error | null, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = undefined>(
    url: NitroFetchRequest,
    config: CustomFetchOptions = {},
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ) {
    return this.request<ResT, NuxtErrorDataT, DataT, PickKeys, DefaultT>(url, {
      ...config,
      method: 'GET'
    }, options)
  }

  post<ResT, NuxtErrorDataT = Error | null, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = undefined>(
    url: NitroFetchRequest,
    config?: CustomFetchOptions,
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
  post<ResT, NuxtErrorDataT = Error | null, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = DataT>(
    url: NitroFetchRequest,
    config?: CustomFetchOptions,
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
  post<ResT, NuxtErrorDataT = Error | null, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = undefined>(
    url: NitroFetchRequest,
    config: CustomFetchOptions = {},
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ) {
    return this.request<ResT, NuxtErrorDataT, DataT, PickKeys, DefaultT>(url, {
      ...config,
      method: 'POST'
    }, options)
  }
}
