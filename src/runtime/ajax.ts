import type { NitroFetchRequest } from 'nitropack'
import type { AsyncData, AsyncDataOptions, NuxtError } from 'nuxt/app'
import type { Ref } from '#imports'
import type { CustomFetchOptions, CustomFetchRequestOptions, FetchContext, FetchResponse, Interceptors, KeysOf, PickFrom, ResolvedCustomFetchOptions } from './type'
import { serialize } from 'ohash'
import { hashKey } from '#app'
// @ts-expect-error virtual file
import { asyncDataDefaults, granularCachedData, pendingWhenIdle } from '#build/nuxt.config.mjs'
import { clearNuxtData, computed, createError, getCurrentInstance, getCurrentScope, isRef, onScopeDispose, reactive, ref, shallowRef, toValue, unref, useAsyncData, useNuxtApp, useRequestFetch, useRuntimeConfig, watch } from '#imports'
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
  _processingMiddleware?: string | boolean
  _asyncData?: Record<string, NuxtAsyncDataEntry | undefined>
  payload?: {
    data?: Record<string, unknown>
    _errors?: Record<string, unknown>
  }
  static?: {
    data?: Record<string, unknown>
  }
  hook?: (name: string, callback: (...args: any[]) => unknown) => (() => void)
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

/** Nuxt's internal `_asyncData` entry: it has no `refresh`/`clear` and is not a promise. */
type NuxtAsyncDataEntry = Omit<ClientAsyncDataEntry, 'clear' | 'execute' | 'refresh'> & {
  _abortController?: AbortController
  _deps?: number
  execute: (opts?: AsyncDataExecuteOptions) => Promise<unknown>
}

type RequestFetchOptions = Omit<CustomFetchRequestOptions, 'key' | 'immutableKey' | 'showLogs' | 'useHandler' | 'handler' | 'offline'>
type ResolvableRequestFetchOptions = RequestFetchOptions & Pick<CustomFetchRequestOptions, 'handler' | 'useHandler'>
type ResolvedRequestFetchOptions = ResolvedCustomFetchOptions & {
  timeout?: number
}

const _cachedController = new Map<string, AbortController>()
const _cachedClientAsyncData = new Map<string, ClientAsyncDataEntry>()
const MAX_UNSCOPED_CLIENT_ASYNC_DATA_ENTRIES = 50

function createAbortController () {
  return typeof AbortController !== 'undefined' ? new AbortController() : undefined
}

function linkAbortSignal (signal: AbortSignal | undefined, controller: AbortController | undefined) {
  if (!signal || !controller) {
    return
  }

  if (signal.aborted) {
    controller.abort((signal as AbortSignal).reason)
    return
  }

  signal.addEventListener('abort', () => controller.abort((signal as AbortSignal).reason), { once: true })
}

/**
 * Merge the provided signals (plus an optional timeout) into a single signal,
 * mirroring Nuxt's `mergeAbortSignals`. Always backed by a dedicated controller
 * so the request still receives an abort signal when the async-data context does
 * not provide one, and returns `undefined` when `AbortController` is unavailable.
 */
function createMergedSignal (signals: Array<AbortSignal | undefined>, timeout?: number) {
  const controller = createAbortController()

  if (!controller) {
    return undefined
  }

  const sources = signals.filter((signal): signal is AbortSignal => !!signal)

  if (typeof timeout === 'number' && timeout >= 0 && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    sources.push(AbortSignal.timeout(timeout))
  }

  for (const signal of sources) {
    linkAbortSignal(signal, controller)
  }

  return controller.signal
}

function pruneClientAsyncDataCache () {
  while (_cachedClientAsyncData.size > MAX_UNSCOPED_CLIENT_ASYNC_DATA_ENTRIES) {
    const oldestEntry = _cachedClientAsyncData.entries().next().value as [string, ClientAsyncDataEntry] | undefined

    if (!oldestEntry) {
      return
    }

    const [, asyncData] = oldestEntry
    asyncData.clear()
  }
}

/** Expose a Nuxt `_asyncData` entry with the public AsyncData methods, mirroring Nuxt's own `refresh`/`clear`. */
function toClientAsyncDataEntry (key: string, entry: NuxtAsyncDataEntry): ClientAsyncDataEntry {
  const execute = async (opts?: AsyncDataExecuteOptions) => {
    await entry.execute(opts)
  }

  return {
    data: entry.data,
    error: entry.error,
    pending: entry.pending,
    status: entry.status,
    execute,
    refresh: execute,
    clear: () => {
      entry._abortController?.abort(new DOMException('AsyncData aborted by user.', 'AbortError'))
      entry._abortController = undefined
      clearNuxtData(key)
    }
  }
}

export function __resetCustomFetchCaches () {
  for (const controller of _cachedController.values()) {
    controller.abort()
  }

  _cachedController.clear()

  for (const asyncData of _cachedClientAsyncData.values()) {
    asyncData.clear()
  }

  _cachedClientAsyncData.clear()
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
    const { useHandler = true, handler } = config
    const query = resolveReactiveValue(toValue(config.query)) || {}
    const params = resolveReactiveValue(toValue(config.params)) || {}
    const baseHandler = handler || this._baseHandler
    const mergeObj = {
      ...params,
      ...query
    }
    // `params` is ofetch's deprecated alias of `query`, so the merged result is always sent as `query`
    if (useHandler && baseHandler && typeof baseHandler === 'function') {
      return { query: baseHandler(mergeObj) }
    }

    return { query: { ...mergeObj } }
  }

  private resolveFetchConfig (config: ResolvableRequestFetchOptions, timeout?: number): ResolvedRequestFetchOptions {
    const { handler: _handler, useHandler: _useHandler, params: _params, ...rawConfig } = config
    const baseConfig = this.baseConfig(config)
    const baseURL = toValue(rawConfig.baseURL)
    const body = resolveReactiveValue<ResolvedRequestFetchOptions['body']>(toValue(rawConfig.body))
    const _cache = toValue(rawConfig.cache)
    const cache = typeof _cache === 'boolean' ? undefined : _cache
    const headers = resolveReactiveValue<ResolvedRequestFetchOptions['headers']>(toValue(rawConfig.headers))
    const method = toValue(rawConfig.method)
    const query = resolveReactiveValue<ResolvedRequestFetchOptions['query']>(toValue(baseConfig.query))

    return {
      ...rawConfig,
      ...baseConfig,
      baseURL,
      body,
      cache,
      headers,
      method,
      query,
      timeout
    }
  }

  request<ResT, NuxtErrorDataT = unknown, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = undefined>(
    url: NitroFetchRequest,
    config: CustomFetchRequestOptions,
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
  request<ResT, NuxtErrorDataT = unknown, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = DataT>(
    url: NitroFetchRequest,
    config: CustomFetchRequestOptions,
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
  request<ResT, NuxtErrorDataT = unknown, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = undefined>(
    url: NitroFetchRequest,
    config: CustomFetchRequestOptions,
    options: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT> = {}
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT> {
    const runtimeConfig = useRuntimeConfig() as RuntimeConfigWithApp
    const resolvedConfig: CustomFetchRequestOptions = {
      ...config,
      baseURL: config.baseURL ?? (toValue(this.baseURL) || runtimeConfig.app?.baseURL || '')
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
    const offlineHandler = _offline ?? this.offline
    const showLogs = _showLogs ?? this.showLogs

    if (import.meta.client && typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineHandler()
    }

    const interceptors = this._interceptors
    const requestFetch = useRequestFetch()
    const requestBehaviorConfig = {
      handler: _handlerConfig,
      useHandler: _useHandler
    }
    const _config: RequestFetchOptions = reactive({ ...fetchConfig })
    const getResolvedFetchConfig = (timeout?: number) => this.resolveFetchConfig({
      ..._config,
      ...requestBehaviorConfig
    }, timeout)
    const initialFetchConfig = getResolvedFetchConfig(options.timeout)

    if (import.meta.dev && import.meta.client && showLogs) {
      const logConfig = Object.fromEntries(Object.entries({
        baseURL: initialFetchConfig.baseURL,
        cache: initialFetchConfig.cache,
        headers: initialFetchConfig.headers,
        key: toValue(resolvedConfig.key),
        method: initialFetchConfig.method,
        query: initialFetchConfig.query
      }).filter(([, value]) => value !== undefined))

      let bodyLogs
      try {
        bodyLogs = serialize(initialFetchConfig.body)
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
    const useImmutableKey = immutableKey ?? this.immutableKey

    if (import.meta.dev && !config.key && useImmutableKey) {
      console.warn('[Custom Fetch] immutableKey is enabled, the key will be generated by hash([custom_fetch:, url])')
    }

    if (!useImmutableKey) {
      hashValue.push(...generateOptionSegments({
        ...initialFetchConfig,
        method: initialFetchConfig.method ?? resolvedConfig.method
      }))
    }

    const defaultKey = hashKey(hashValue).slice(0, 10)

    const key = computed(() => toValue(resolvedConfig.key) || defaultKey)

    const executeRequest = (executeOptions: AsyncDataExecuteOptions = {}) => {
      const timeout = executeOptions.timeout ?? options.timeout
      const signal = createMergedSignal([executeOptions.signal], timeout)

      return requestFetch(url as string, {
        ...defaultOptions,
        ...getResolvedFetchConfig(timeout),
        signal
      }) as unknown as Promise<ResT>
    }

    const _handler = (_nuxtApp: unknown, context: { signal: AbortSignal }) => {
      return executeRequest({
        signal: context.signal,
        timeout: options.timeout
      })
    }

    const nuxtApp = useNuxtApp() as NuxtAppWithAsyncData

    const createClientAsyncDataFallback = (): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT> => {
      const _ref = options.deep ? ref : shallowRef
      const usePendingRef = pendingWhenIdle
      const getDefaultValue = () => {
        if (options.default) {
          return unref(options.default()) as CustomFetchData<DataT, PickKeys, DefaultT>
        }

        return asyncDataDefaults.value as CustomFetchData<DataT, PickKeys, DefaultT>
      }

      const resolveCachedData = (cause: AsyncDataRefreshCause = 'refresh:manual') => {
        if (options.getCachedData) {
          return options.getCachedData(key.value, nuxtApp as any, { cause }) as CustomFetchData<DataT, PickKeys, DefaultT> | undefined
        }

        if (nuxtApp.isHydrating) {
          return nuxtApp.payload?.data?.[key.value] as CustomFetchData<DataT, PickKeys, DefaultT> | undefined
        }

        if (cause !== 'refresh:manual' && cause !== 'refresh:hook') {
          return nuxtApp.static?.data?.[key.value] as CustomFetchData<DataT, PickKeys, DefaultT> | undefined
        }

        return undefined
      }

      const writePayloadData = (value: CustomFetchData<DataT, PickKeys, DefaultT>) => {
        if (nuxtApp.payload?.data) {
          nuxtApp.payload.data[key.value] = value
        }
      }

      const isKeyReactive = isRef(resolvedConfig.key) || typeof resolvedConfig.key === 'function'

      let activeController: AbortController | undefined
      let activeRequest: Promise<void> | undefined
      let requestId = 0
      let hasData = false
      let keyChanging = false
      let stopKeyWatch: (() => void) | undefined
      let stopOptionWatch: (() => void) | undefined
      let stopEnabledWatch: (() => void) | undefined
      let stopRefreshHook: (() => void) | undefined

      const initialStatus = options.immediate === false || toValue(options.enabled) === false ? 'idle' : 'pending'
      const statusRef = _ref(initialStatus) as Ref<'idle' | 'pending' | 'success' | 'error'>
      const pendingRef = (usePendingRef
        ? _ref(initialStatus === 'pending')
        : computed(() => statusRef.value === 'pending')) as Ref<boolean>

      const setPending = (value: boolean) => {
        if (usePendingRef) {
          pendingRef.value = value
        }
      }

      const stopWatchers = () => {
        stopKeyWatch?.()
        stopKeyWatch = undefined
        stopOptionWatch?.()
        stopOptionWatch = undefined
        stopEnabledWatch?.()
        stopEnabledWatch = undefined
        stopRefreshHook?.()
        stopRefreshHook = undefined
      }

      const asyncData: CustomFetchAsyncDataState<DataT, PickKeys, DefaultT, NuxtErrorDataT> = {
        data: _ref(getDefaultValue()) as Ref<CustomFetchData<DataT, PickKeys, DefaultT>>,
        error: _ref(asyncDataDefaults.errorValue) as Ref<CustomFetchError<NuxtErrorDataT>>,
        status: statusRef,
        pending: pendingRef,
        clear: () => {
          stopWatchers()
          activeController?.abort()
          _cachedController.delete(key.value)
          if (_cachedClientAsyncData.get(key.value) === asyncData) {
            _cachedClientAsyncData.delete(key.value)
          }
          hasData = false
          asyncData.data.value = getDefaultValue()
          asyncData.error.value = asyncDataDefaults.errorValue
          asyncData.status.value = 'idle'
          setPending(false)
          clearNuxtData(key.value)
        },
        refresh: async (executeOptions?: AsyncDataExecuteOptions) => {
          await asyncData.execute(executeOptions)
        },
        execute: async (executeOptions?: AsyncDataExecuteOptions) => {
          const cause = executeOptions?.cause
          const dedupe = executeOptions?.dedupe ?? options.dedupe ?? 'cancel'
          if (activeRequest) {
            if (dedupe === 'defer') {
              return activeRequest
            }

            activeController?.abort()
          }

          if (granularCachedData || cause === 'initial' || nuxtApp.isHydrating) {
            const cachedData = resolveCachedData(cause)
            if (cachedData !== undefined) {
              writePayloadData(cachedData)
              hasData = true
              asyncData.data.value = cachedData
              asyncData.error.value = asyncDataDefaults.errorValue
              asyncData.status.value = 'success'
              setPending(false)
              return
            }
          }

          if (toValue(options.enabled) === false) {
            return
          }

          const currentRequestId = ++requestId
          const controller = createAbortController()
          activeController = controller
          linkAbortSignal(executeOptions?.signal, controller)

          if (controller) {
            _cachedController.set(key.value, controller)
          }

          setPending(true)
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

              const value = finalData as CustomFetchData<DataT, PickKeys, DefaultT>
              writePayloadData(value)
              hasData = true
              asyncData.data.value = value
              asyncData.error.value = asyncDataDefaults.errorValue
              asyncData.status.value = 'success'
            })
            .catch((error: any) => {
              if (currentRequestId !== requestId || controller?.signal.aborted) {
                return
              }

              hasData = false
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

              setPending(false)
            })

          await activeRequest
        }
      }

      // Like Nuxt: abort the in-flight request and settle the state right away (on unmount or `enabled: false`).
      const cancelActiveRequest = (reason: string) => {
        if (!activeRequest) {
          return
        }

        requestId++
        activeController?.abort(new DOMException(reason, 'AbortError'))
        activeRequest = undefined
        activeController = undefined
        _cachedController.delete(key.value)

        if (asyncData.status.value === 'pending') {
          asyncData.status.value = 'idle'
        }

        setPending(false)
      }

      _cachedClientAsyncData.set(key.value, asyncData as ClientAsyncDataEntry)

      stopRefreshHook = nuxtApp.hook?.('app:data:refresh', async (keys?: string[]) => {
        if (!keys || keys.includes(key.value)) {
          await asyncData.execute({ cause: 'refresh:hook' })
        }
      })

      if (isKeyReactive) {
        stopKeyWatch = watch(key, (newKey, oldKey) => {
          if (!((newKey || oldKey) && newKey !== oldKey)) {
            return
          }

          keyChanging = true
          const hadData = hasData
          const wasRunning = activeRequest !== undefined

          if (oldKey) {
            _cachedController.get(oldKey)?.abort?.()
            _cachedController.delete(oldKey)

            if (_cachedClientAsyncData.get(oldKey) === asyncData) {
              _cachedClientAsyncData.delete(oldKey)
            }
          }

          _cachedClientAsyncData.set(newKey, asyncData as ClientAsyncDataEntry)

          const keyTriggersExecute = (options as { _keyTriggersExecute?: boolean })._keyTriggersExecute !== false
          if (keyTriggersExecute && (options.immediate !== false || hadData || wasRunning)) {
            void asyncData.execute({ cause: 'watch' })
          }

          void Promise.resolve().then(() => {
            keyChanging = false
          })
        }, { flush: 'sync' })
      }

      const hasScope = getCurrentScope()
      if (options.watch) {
        stopOptionWatch = watch(options.watch, async () => {
          if (keyChanging) {
            return
          }

          await asyncData.refresh({ cause: 'watch' })
        }, { flush: 'post' })
      }

      if (isRef(options.enabled) || typeof options.enabled === 'function') {
        stopEnabledWatch = watch(() => toValue(options.enabled), (isEnabled) => {
          if (!isEnabled) {
            cancelActiveRequest('AsyncData request cancelled by `enabled: false`')
          }
        })
      }

      if (!hasScope) {
        pruneClientAsyncDataCache()
      }

      if (hasScope) {
        onScopeDispose(() => {
          stopWatchers()
          cancelActiveRequest('AsyncData request cancelled by unmount')
        })
      }

      if (options.immediate === false) {
        return Promise.resolve(asyncData) as CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
      }

      return asyncData.execute({ cause: 'initial' }).then(() => asyncData) as CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
    }

    const sharedAsyncData = nuxtApp._asyncData?.[key.value]
    const cachedClientAsyncData = _cachedClientAsyncData.get(key.value)
    const instance = getCurrentInstance()

    // Only fall back where Nuxt would warn "Component is already mounted"; setup code keeps using useAsyncData.
    if (import.meta.client && !nuxtApp.isHydrating && !nuxtApp._processingMiddleware && (!instance || instance.isMounted)) {
      const reusableAsyncData = sharedAsyncData?._deps && typeof sharedAsyncData.execute === 'function'
        ? toClientAsyncDataEntry(key.value, sharedAsyncData)
        : cachedClientAsyncData

      if (reusableAsyncData) {
        if (options.immediate === false) {
          return Promise.resolve(reusableAsyncData) as CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
        }

        return reusableAsyncData.execute({
          cause: 'initial',
          dedupe: options.dedupe
        }).then(() => reusableAsyncData) as CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
      }

      return createClientAsyncDataFallback()
    }

    return useAsyncData<ResT, NuxtErrorDataT, DataT, PickKeys, DefaultT>(key, _handler, options) as CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
  }

  get<ResT, NuxtErrorDataT = unknown, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = undefined>(
    url: NitroFetchRequest,
    config?: CustomFetchOptions,
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
  get<ResT, NuxtErrorDataT = unknown, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = DataT>(
    url: NitroFetchRequest,
    config?: CustomFetchOptions,
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
  get<ResT, NuxtErrorDataT = unknown, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = undefined>(
    url: NitroFetchRequest,
    config: CustomFetchOptions = {},
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ) {
    return this.request<ResT, NuxtErrorDataT, DataT, PickKeys, DefaultT>(url, {
      ...config,
      method: 'GET'
    }, options)
  }

  post<ResT, NuxtErrorDataT = unknown, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = undefined>(
    url: NitroFetchRequest,
    config?: CustomFetchOptions,
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
  post<ResT, NuxtErrorDataT = unknown, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = DataT>(
    url: NitroFetchRequest,
    config?: CustomFetchOptions,
    options?: AsyncDataOptions<ResT, DataT, PickKeys, DefaultT>
  ): CustomFetchReturnValue<DataT, PickKeys, DefaultT, NuxtErrorDataT>
  post<ResT, NuxtErrorDataT = unknown, DataT = ResT, PickKeys extends KeysOf<DataT> = KeysOf<DataT>, DefaultT = undefined>(
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
