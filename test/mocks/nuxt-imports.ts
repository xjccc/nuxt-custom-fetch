interface MockRef<T> {
  value: T
}

interface WatchCall {
  source: unknown
  callback: (...args: any[]) => unknown
  options?: unknown
}

type UseAsyncDataImpl = (...args: any[]) => any
type RequestFetchImpl = (...args: any[]) => Promise<unknown>
interface NuxtAppState {
  isHydrating: boolean
  _asyncData: Record<string, {
    _deps?: number
    execute?: (opts?: unknown) => Promise<unknown>
  } | undefined>
}

function isRefLike<T> (value: unknown): value is MockRef<T> {
  return typeof value === 'object' && value !== null && 'value' in value
}

function unwrap<T> (value: T): T {
  if (typeof value === 'function') {
    return (value as () => T)()
  }

  if (isRefLike(value)) {
    return value.value as T
  }

  return value
}

function createInitialState () {
  return {
    runtimeConfig: { app: { baseURL: '/runtime-base' } },
    nuxtApp: {
      isHydrating: true,
      _asyncData: {}
    } as NuxtAppState,
    requestFetch: (async () => undefined) as RequestFetchImpl,
    useAsyncData: (async (key: unknown, handler: unknown, options: unknown) => ({
      key,
      handler,
      options
    })) as UseAsyncDataImpl,
    clearNuxtDataCalls: [] as string[],
    watchCalls: [] as WatchCall[],
    watchStopCalls: 0,
    scopeDisposers: [] as Array<() => void>,
    currentScope: null as unknown
  }
}

const state = createInitialState()

export function __resetNuxtMocks () {
  const nextState = createInitialState()
  state.runtimeConfig = nextState.runtimeConfig
  state.nuxtApp = nextState.nuxtApp
  state.requestFetch = nextState.requestFetch
  state.useAsyncData = nextState.useAsyncData
  state.clearNuxtDataCalls = []
  state.watchCalls = []
  state.watchStopCalls = 0
  state.scopeDisposers = []
  state.currentScope = nextState.currentScope
}

export function __setRuntimeConfig (runtimeConfig: typeof state.runtimeConfig) {
  state.runtimeConfig = runtimeConfig
}

export function __setNuxtApp (nuxtApp: typeof state.nuxtApp) {
  state.nuxtApp = nuxtApp
}

export function __setUseAsyncDataImpl (implementation: UseAsyncDataImpl) {
  state.useAsyncData = implementation
}

export function __setRequestFetchImpl (implementation: RequestFetchImpl) {
  state.requestFetch = implementation
}

export function __getNuxtMockState () {
  return state
}

export function clearNuxtData (key: string) {
  state.clearNuxtDataCalls.push(key)
}

export function computed<T> (getter: () => T) {
  return {
    get value () {
      return getter()
    }
  }
}

export function createError (error: unknown) {
  return error instanceof Error ? error : new Error(String(error))
}

export function getCurrentScope () {
  return state.currentScope
}

export function onScopeDispose (callback: () => void) {
  state.scopeDisposers.push(callback)
}

export function reactive<T extends object> (value: T) {
  return value
}

export function ref<T> (value: T): MockRef<T> {
  return { value }
}

export const shallowRef = ref

export function toValue<T> (value: T): T {
  return unwrap(value)
}

export function unref<T> (value: T): T {
  return unwrap(value)
}

export function useAsyncData (...args: Parameters<UseAsyncDataImpl>) {
  return state.useAsyncData(...args)
}

export function useRequestFetch () {
  return state.requestFetch
}

export function useRuntimeConfig () {
  return state.runtimeConfig
}

export function useNuxtApp () {
  return state.nuxtApp
}

export function watch (source: unknown, callback: (...args: any[]) => unknown, options?: unknown) {
  state.watchCalls.push({
    source,
    callback,
    options
  })
  return () => {
    state.watchStopCalls += 1
  }
}
