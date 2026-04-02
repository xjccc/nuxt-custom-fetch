import type { AsyncDataOptions } from 'nuxt/app'
import { ref } from '#imports'
import { computed } from 'vue'
import { CustomFetch } from '../src/runtime/ajax'
import { asyncDataDefaults } from './mocks/nuxt-config'
import { __getNuxtMockState, __setNuxtApp, __setRequestFetchImpl, __setRuntimeConfig, __setUseAsyncDataImpl } from './mocks/nuxt-imports'

function createAsyncDataResult<DataT> (data: DataT) {
  const execute = vi.fn(async () => {})

  return {
    data: ref(data),
    error: ref(undefined),
    status: ref('success'),
    pending: ref(false),
    refresh: execute,
    execute,
    clear: vi.fn()
  }
}

describe('customFetch', () => {
  it('delegates to useAsyncData and resolves request config before fetching', async () => {
    interface HelloResponse {
      ok: boolean
    }

    const requestFetch = vi.fn().mockResolvedValue({ ok: true })
    const instanceOnRequest = vi.fn()
    const requestOnRequest = vi.fn()
    let capturedOptions: AsyncDataOptions<HelloResponse> | undefined

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (_key, handler, options) => {
      capturedOptions = options

      return createAsyncDataResult(await handler({}, {
        signal: new AbortController().signal
      }))
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      handler: params => ({
        ...params,
        token: 'abc'
      }),
      onRequest: instanceOnRequest
    })

    const { data } = await ajax.get('/hello', {
      headers: {
        authorization: ref('Bearer token')
      },
      onRequest: requestOnRequest,
      params: {
        page: ref(1)
      }
    }, {
      timeout: 250
    })

    expect(capturedOptions).toEqual({ timeout: 250 })
    expect(data.value).toEqual({ ok: true })
    expect(requestFetch).toHaveBeenCalledTimes(1)

    const [request, fetchOptions] = requestFetch.mock.calls[0] as [string, Record<string, any>]

    expect(request).toBe('/hello')
    expect(fetchOptions).toMatchObject({
      baseURL: '/api',
      headers: {
        authorization: 'Bearer token'
      },
      method: 'GET',
      params: {
        page: 1,
        token: 'abc'
      },
      timeout: 250
    })
    expect(fetchOptions.signal).toBeInstanceOf(AbortSignal)

    await fetchOptions.onRequest({
      options: fetchOptions,
      request
    })

    expect(instanceOnRequest).toHaveBeenCalledTimes(1)
    expect(requestOnRequest).toHaveBeenCalledTimes(1)
  })

  it('calls the offline handler when navigator is offline on the client', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })
    const offline = vi.fn()

    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      value: false
    })

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (_key, handler) => {
      return createAsyncDataResult(await handler({}, {
        signal: new AbortController().signal
      }))
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      offline,
      showLogs: false
    })

    const { data } = await ajax.get<{ ok: boolean }>('/hello')

    expect(data.value).toEqual({ ok: true })
    expect(offline).toHaveBeenCalledTimes(1)
  })

  it('logs request details when showLogs is enabled on the client', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })
    const warn = vi.spyOn(console, 'warn')

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (_key, handler) => {
      return createAsyncDataResult(await handler({}, {
        signal: new AbortController().signal
      }))
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: true
    })

    await ajax.post<{ ok: boolean }>('/hello', {
      body: {
        name: ref('Ada')
      },
      params: {
        page: 1
      }
    })

    expect(warn).toHaveBeenCalled()
    expect(warn.mock.calls[0]?.[0]).toContain('[Request URL]: /hello')
    expect(warn.mock.calls[0]?.[0]).toContain('[Body]')
  })

  it('does not log request details when showLogs is disabled', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })
    const warn = vi.spyOn(console, 'warn')

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (_key, handler) => {
      return createAsyncDataResult(await handler({}, {
        signal: new AbortController().signal
      }))
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })

    await ajax.get<{ ok: boolean }>('/hello', {
      params: {
        page: 1
      }
    })

    expect(warn).not.toHaveBeenCalled()
  })

  it('logs computed keys and params as resolved values', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })
    const warn = vi.spyOn(console, 'warn')

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (_key, handler) => {
      return createAsyncDataResult(await handler({}, {
        signal: new AbortController().signal
      }))
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: true
    })

    await ajax.get<{ ok: boolean }>('/hello', {
      key: computed(() => 'user-5'),
      params: {
        userId: computed(() => 5)
      }
    })

    const message = warn.mock.calls[0]?.[0]

    expect(message).toContain('key:\'user-5\'')
    expect(message).toContain('userId:5')
    expect(message).not.toContain('ComputedRefImpl')
  })

  it('uses requestFetch directly on the client after hydration', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })
    const useAsyncData = vi.fn()

    __setNuxtApp({
      isHydrating: false,
      _asyncData: {}
    })
    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(useAsyncData)

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })
    const { data, status } = await ajax.get<{ ok: boolean }>('/hello')

    expect(data.value).toEqual({ ok: true })
    expect(status.value).toBe('success')
    expect(requestFetch).toHaveBeenCalledTimes(1)
    expect(useAsyncData).not.toHaveBeenCalled()
  })

  it('aborts duplicate client requests with the same key after hydration', async () => {
    let firstSignal: AbortSignal | undefined
    let resolveFirstRequest: ((value: { ok: boolean }) => void) | undefined
    const requestFetch = vi
      .fn()
      .mockImplementationOnce((_request, options) => new Promise<{ ok: boolean }>((resolve) => {
        firstSignal = (options as Record<string, any>).signal as AbortSignal | undefined
        resolveFirstRequest = resolve
      }))
      .mockResolvedValueOnce({ ok: true })

    __setNuxtApp({
      isHydrating: false,
      _asyncData: {}
    })
    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(vi.fn())

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })
    const firstRequest = ajax.get<{ ok: boolean }>('/hello', {
      key: 'duplicate:key'
    })
    const secondRequest = ajax.get<{ ok: boolean }>('/hello', {
      key: 'duplicate:key'
    })

    const { data } = await secondRequest

    expect(firstSignal?.aborted).toBe(true)
    expect(data.value).toEqual({ ok: true })
    expect(requestFetch).toHaveBeenCalledTimes(2)

    resolveFirstRequest?.({ ok: false })
    await firstRequest
  })

  it('reuses existing nuxt asyncData entries on the client after hydration', async () => {
    const requestFetch = vi.fn()
    const useAsyncData = vi.fn()
    const execute = vi.fn(async () => {})
    const sharedAsyncData = {
      _deps: 1,
      clear: vi.fn(),
      data: ref({ ok: true }),
      error: ref(undefined),
      execute,
      pending: ref(false),
      refresh: execute,
      status: ref('success')
    }

    __setNuxtApp({
      isHydrating: false,
      _asyncData: {
        'shared:key': sharedAsyncData
      }
    })
    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(useAsyncData)

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })
    const asyncData = await ajax.get<{ ok: boolean }>('/hello', {
      key: 'shared:key'
    }, {
      dedupe: 'defer'
    })

    expect(asyncData).toBe(sharedAsyncData)
    expect(execute).toHaveBeenCalledWith({
      cause: 'initial',
      dedupe: 'defer'
    })
    expect(requestFetch).not.toHaveBeenCalled()
    expect(useAsyncData).not.toHaveBeenCalled()
  })

  it('does not reuse hydrated asyncData when only query changes', async () => {
    const requestFetch = vi
      .fn()
      .mockResolvedValueOnce({ page: 1 })
      .mockResolvedValueOnce({ page: 2 })
    const sharedExecute = vi.fn(async () => {})
    const sharedAsyncData = {
      _deps: 1,
      clear: vi.fn(),
      data: ref({ page: 1 }),
      error: ref(undefined),
      execute: sharedExecute,
      pending: ref(false),
      refresh: sharedExecute,
      status: ref('success')
    }
    let hydratedKey = ''

    __setNuxtApp({
      isHydrating: true,
      _asyncData: {}
    })
    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (key, handler) => {
      hydratedKey = key.value

      return createAsyncDataResult(await handler({}, {
        signal: new AbortController().signal
      }))
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })

    await ajax.get<{ page: number }>('/hello', {
      params: {
        type: 'params'
      },
      query: {
        page: 1
      },
      useHandler: false
    })

    __setNuxtApp({
      isHydrating: false,
      _asyncData: {
        [hydratedKey]: sharedAsyncData
      }
    })

    const { data } = await ajax.get<{ page: number }>('/hello', {
      params: {
        type: 'params'
      },
      query: {
        page: 2
      },
      useHandler: false
    })

    expect(data.value).toEqual({ page: 2 })
    expect(requestFetch).toHaveBeenCalledTimes(2)
    expect(sharedExecute).not.toHaveBeenCalled()
  })

  it('creates an internal abort signal when the async-data context does not provide one', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (_key, handler) => {
      return createAsyncDataResult(await handler({}, {
        signal: undefined
      }))
    })

    const ajax = new CustomFetch({ baseURL: '/api' })
    const { data } = await ajax.get<{ ok: boolean }>('/hello')

    expect(data.value).toEqual({ ok: true })

    const [, fetchOptions] = requestFetch.mock.calls.at(-1) as [string, Record<string, any>]
    expect(fetchOptions.signal).toBeInstanceOf(AbortSignal)
    expect(fetchOptions.signal.aborted).toBe(false)
  })

  it('links the async-data abort signal to the internal request signal', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })
    let capturedSignal: AbortSignal | undefined

    __setRequestFetchImpl(async (request, options) => {
      capturedSignal = (options as Record<string, any>).signal as AbortSignal
      return requestFetch(request, options)
    })
    __setUseAsyncDataImpl(async (_key, handler) => {
      const controller = new AbortController()
      const result = await handler({}, {
        signal: controller.signal
      })

      controller.abort()

      return createAsyncDataResult(result)
    })

    const ajax = new CustomFetch({ baseURL: '/api' })
    const { data } = await ajax.get<{ ok: boolean }>('/hello')

    expect(data.value).toEqual({ ok: true })
    expect(capturedSignal).toBeDefined()
    expect(capturedSignal?.aborted).toBe(true)
  })

  it('marks the internal request signal as aborted when the async-data signal is already aborted', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })
    let capturedSignal: AbortSignal | undefined

    __setRequestFetchImpl(async (request, options) => {
      capturedSignal = (options as Record<string, any>).signal as AbortSignal
      return requestFetch(request, options)
    })
    __setUseAsyncDataImpl(async (_key, handler) => {
      const controller = new AbortController()
      controller.abort()

      return createAsyncDataResult(await handler({}, {
        signal: controller.signal
      }))
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })
    const { data } = await ajax.get<{ ok: boolean }>('/hello')

    expect(data.value).toEqual({ ok: true })
    expect(capturedSignal?.aborted).toBe(true)
  })

  it('continues without a request signal when AbortController is unavailable', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })
    const originalAbortController = globalThis.AbortController

    vi.stubGlobal('AbortController', undefined)
    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (_key, handler) => {
      return createAsyncDataResult(await handler({}, {
        signal: undefined
      }))
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })
    const { data } = await ajax.get<{ ok: boolean }>('/hello')

    expect(data.value).toEqual({ ok: true })

    const [, fetchOptions] = requestFetch.mock.calls.at(-1) as [string, Record<string, any>]
    expect(fetchOptions.signal).toBeUndefined()

    vi.stubGlobal('AbortController', originalAbortController)
  })

  it('uses an explicit key and keeps POST body values unwrapped', async () => {
    interface CreateResponse {
      created: boolean
    }

    const requestFetch = vi.fn().mockResolvedValue({ created: true })
    let capturedKey = ''

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (key, handler) => {
      capturedKey = key.value

      return createAsyncDataResult(await handler({}, {
        signal: new AbortController().signal
      }))
    })

    const ajax = new CustomFetch({ baseURL: '/api' })
    const { data } = await ajax.post<CreateResponse>('/items', {
      body: {
        name: ref('Ada')
      },
      key: ref('items:create')
    })

    expect(capturedKey).toBe('items:create')
    expect(data.value).toEqual({ created: true })
    expect(requestFetch).toHaveBeenCalledWith('/items', expect.objectContaining({
      body: {
        name: 'Ada'
      },
      method: 'POST'
    }))
  })

  it('generates stable keys from url only when immutableKey is enabled', async () => {
    const capturedKeys: string[] = []

    __setUseAsyncDataImpl(async (key) => {
      capturedKeys.push(key.value)

      return createAsyncDataResult({ ok: true })
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      immutableKey: true
    })

    const { data: firstData } = await ajax.get<{ ok: boolean }>('/hello', {
      params: {
        page: 1
      }
    })
    const { data: secondData } = await ajax.get<{ ok: boolean }>('/hello', {
      params: {
        page: 2
      }
    })

    expect(firstData.value).toEqual({ ok: true })
    expect(secondData.value).toEqual({ ok: true })
    expect(capturedKeys).toHaveLength(2)
    expect(capturedKeys[0]).toBe(capturedKeys[1])
  })

  it('warns when immutableKey is enabled without an explicit key in dev mode', async () => {
    const warn = vi.spyOn(console, 'warn')

    __setUseAsyncDataImpl(async () => {
      return createAsyncDataResult({ ok: true })
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      immutableKey: true,
      showLogs: false
    })

    await ajax.get<{ ok: boolean }>('/hello', {
      params: {
        page: 1
      }
    })

    expect(warn).toHaveBeenCalledWith('[Custom Fetch] immutableKey is enabled, the key will be generated by hash([custom_fetch:, url])')
  })

  it('uses runtime config baseURL when instance baseURL is empty', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })

    __setRuntimeConfig({
      app: {
        baseURL: '/runtime-base'
      }
    })
    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (_key, handler) => {
      return createAsyncDataResult(await handler({}, {
        signal: new AbortController().signal
      }))
    })

    const ajax = new CustomFetch({})
    const { data } = await ajax.get<{ ok: boolean }>('/runtime')

    expect(data.value).toEqual({ ok: true })
    expect(requestFetch).toHaveBeenCalledWith('/runtime', expect.objectContaining({
      baseURL: '/runtime-base',
      method: 'GET'
    }))
  })

  it('uses query payload and bypasses handler when useHandler is false', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (_key, handler) => {
      return createAsyncDataResult(await handler({}, {
        signal: new AbortController().signal
      }))
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      handler: params => ({
        ...params,
        token: 'abc'
      })
    })

    const { data } = await ajax.get<{ ok: boolean }>('/search', {
      params: {
        page: 1
      },
      query: {
        search: ref('nuxt')
      },
      useHandler: false
    })

    expect(data.value).toEqual({ ok: true })
    expect(requestFetch).toHaveBeenCalledWith('/search', expect.objectContaining({
      method: 'GET',
      params: {
        page: 1
      },
      query: {
        page: 1,
        search: 'nuxt'
      }
    }))

    const [, fetchOptions] = requestFetch.mock.calls.at(-1) as [string, Record<string, any>]
    expect(fetchOptions.params).toEqual({ page: 1 })
    expect(fetchOptions.query.token).toBeUndefined()
  })

  it('prefers request-level handler over the instance handler', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (_key, handler) => {
      return createAsyncDataResult(await handler({}, {
        signal: new AbortController().signal
      }))
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      handler: params => ({
        ...params,
        token: 'instance-token'
      })
    })

    const { data } = await ajax.get<{ ok: boolean }>('/hello', {
      handler: params => ({
        ...params,
        locale: 'zh-CN'
      }),
      params: {
        page: 1
      }
    })

    expect(data.value).toEqual({ ok: true })
    expect(requestFetch).toHaveBeenCalledWith('/hello', expect.objectContaining({
      method: 'GET',
      params: {
        page: 1,
        locale: 'zh-CN'
      }
    }))

    const [, fetchOptions] = requestFetch.mock.calls.at(-1) as [string, Record<string, any>]
    expect(fetchOptions.params.token).toBeUndefined()
  })

  it('composes response interceptors from instance and request config', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })
    const instanceOnResponse = vi.fn()
    const requestOnResponse = vi.fn()
    const instanceOnResponseError = vi.fn()
    const requestOnResponseError = vi.fn()

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (_key, handler) => {
      return createAsyncDataResult(await handler({}, {
        signal: new AbortController().signal
      }))
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      onResponse: instanceOnResponse,
      onResponseError: instanceOnResponseError
    })

    const { data } = await ajax.get<{ ok: boolean }>('/hello', {
      onResponse: requestOnResponse,
      onResponseError: requestOnResponseError
    })

    expect(data.value).toEqual({ ok: true })

    const [request, fetchOptions] = requestFetch.mock.calls.at(-1) as [string, Record<string, any>]
    const response = {
      status: 200,
      _data: { ok: true }
    }

    await fetchOptions.onResponse({
      options: fetchOptions,
      request,
      response
    })

    await fetchOptions.onResponseError({
      options: fetchOptions,
      request,
      response
    })

    expect(instanceOnResponse).toHaveBeenCalledTimes(1)
    expect(requestOnResponse).toHaveBeenCalledTimes(1)
    expect(instanceOnResponseError).toHaveBeenCalledTimes(1)
    expect(requestOnResponseError).toHaveBeenCalledTimes(1)
  })

  it('composes request error interceptors from instance and request config', async () => {
    const requestFetch = vi.fn().mockResolvedValue({ ok: true })
    const instanceOnRequestError = vi.fn()
    const requestOnRequestError = vi.fn()

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(async (_key, handler) => {
      return createAsyncDataResult(await handler({}, {
        signal: new AbortController().signal
      }))
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      onRequestError: instanceOnRequestError
    })

    const { data } = await ajax.get<{ ok: boolean }>('/hello', {
      onRequestError: requestOnRequestError
    })

    expect(data.value).toEqual({ ok: true })

    const [request, fetchOptions] = requestFetch.mock.calls.at(-1) as [string, Record<string, any>]
    const error = new Error('network failed')

    await fetchOptions.onRequestError({
      error,
      options: fetchOptions,
      request
    })

    expect(instanceOnRequestError).toHaveBeenCalledTimes(1)
    expect(requestOnRequestError).toHaveBeenCalledTimes(1)
  })

  it('falls back to client async-data compatibility mode for setup-context errors', async () => {
    interface FallbackResponse {
      count: number
      extra: string
    }

    interface PickedFallbackResponse {
      count: number
    }

    const requestFetch = vi
      .fn()
      .mockResolvedValueOnce({
        count: 2,
        extra: 'first'
      })
      .mockResolvedValueOnce({
        count: 3,
        extra: 'second'
      })
    const key = ref('fallback:1')
    const watchedSource = ref(1)
    const mockState = __getNuxtMockState()

    mockState.currentScope = {}
    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(() => {
      throw new Error('Component is already mounted')
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })
    const asyncData = await ajax.get<FallbackResponse, Error | null, FallbackResponse, ['count'], PickedFallbackResponse>('/hello', {
      key
    }, {
      default: () => ref({ count: 0 }),
      immediate: false,
      pick: ['count'],
      watch: [() => watchedSource.value]
    })

    expect(asyncData.data.value).toEqual({ count: 0 })
    expect(asyncData.status.value).toBe('idle')
    expect(asyncData.pending.value).toBe(false)
    expect(mockState.watchCalls).toHaveLength(2)
    expect(mockState.scopeDisposers).toHaveLength(1)

    const keyWatch = mockState.watchCalls.find(call => !Array.isArray(call.source))
    const sourceWatch = mockState.watchCalls.find(call => Array.isArray(call.source))

    expect(keyWatch).toBeDefined()
    expect(sourceWatch).toBeDefined()

    await asyncData.execute()
    expect(asyncData.data.value).toEqual({ count: 2 })
    expect(asyncData.status.value).toBe('success')

    key.value = 'fallback:2'
    await keyWatch?.callback('fallback:2', 'fallback:1')
    expect(asyncData.data.value).toEqual({ count: 2 })

    watchedSource.value = 2
    await sourceWatch?.callback()
    expect(asyncData.data.value).toEqual({ count: 3 })

    asyncData.clear()
    expect(asyncData.data.value).toEqual({ count: 0 })
    expect(asyncData.status.value).toBe('idle')
    expect(asyncData.pending.value).toBe(false)
    expect(mockState.clearNuxtDataCalls).toContain('fallback:2')
  })

  it('re-fetches when the fallback key changes and immediate mode is enabled', async () => {
    interface FallbackResponse {
      count: number
      extra: string
    }

    interface PickedFallbackResponse {
      count: number
    }

    const requestFetch = vi
      .fn()
      .mockResolvedValueOnce({
        count: 1,
        extra: 'first'
      })
      .mockResolvedValueOnce({
        count: 2,
        extra: 'second'
      })
    const key = ref('fallback:watch:1')
    const mockState = __getNuxtMockState()

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(() => {
      throw new Error('requires access to the nuxt instance')
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })
    const asyncData = await ajax.get<FallbackResponse, Error | null, FallbackResponse, ['count'], PickedFallbackResponse>('/hello', {
      key
    }, {
      default: () => ({ count: 0 }),
      pick: ['count']
    })

    const keyWatch = mockState.watchCalls.find(call => !Array.isArray(call.source))

    expect(keyWatch).toBeDefined()

    expect(asyncData.data.value).toEqual({ count: 1 })

    key.value = 'fallback:watch:2'
    await keyWatch?.callback('fallback:watch:2', 'fallback:watch:1')

    expect(asyncData.data.value).toEqual({ count: 2 })
  })

  it('reuses the pending fallback request when dedupe is defer', async () => {
    let resolveRequest: ((value: { count: number }) => void) | undefined
    const requestFetch = vi.fn(() => new Promise<{ count: number }>((resolve) => {
      resolveRequest = resolve
    }))

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(() => {
      throw new Error('outside of a nuxt instance')
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })
    const asyncData = await ajax.get<{ count: number }>('/hello', {}, {
      default: () => ({ count: 0 }),
      immediate: false
    })

    const firstExecute = asyncData.execute()
    const secondExecute = asyncData.execute({ dedupe: 'defer' })

    expect(requestFetch).toHaveBeenCalledTimes(1)

    resolveRequest?.({ count: 1 })
    await Promise.all([firstExecute, secondExecute])

    expect(asyncData.data.value).toEqual({ count: 1 })
    expect(asyncData.status.value).toBe('success')
  })

  it('restores default data and error state when client fallback execution fails', async () => {
    const requestFetch = vi.fn().mockRejectedValue(new Error('boom'))

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(() => {
      throw new Error('outside of a plugin')
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })
    const asyncData = await ajax.get<string>('/hello', {}, {
      default: () => 'ready',
      immediate: false
    })

    await asyncData.execute()

    expect(asyncData.data.value).toBe('ready')
    expect(asyncData.status.value).toBe('error')
    expect(asyncData.pending.value).toBe(false)
    expect(asyncData.error.value).toBeInstanceOf(Error)
  })

  it('uses asyncDataDefaults and refresh in fallback without a scope', async () => {
    const previousValue = asyncDataDefaults.value
    const previousErrorValue = asyncDataDefaults.errorValue
    const requestFetch = vi.fn().mockResolvedValue({ count: 5 })
    const watchedSource = ref(1)
    const mockState = __getNuxtMockState()

    asyncDataDefaults.value = { count: 0 }
    asyncDataDefaults.errorValue = undefined

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(() => {
      throw new Error('outside of a plugin')
    })

    try {
      const ajax = new CustomFetch({
        baseURL: '/api',
        showLogs: false
      })
      const asyncData = await ajax.get<{ count: number }>('/hello', {}, {
        deep: true,
        immediate: false,
        transform: result => ({
          count: result.count + 1
        }),
        watch: [() => watchedSource.value]
      })

      expect(asyncData.data.value).toEqual({ count: 0 })
      expect(asyncData.error.value).toBeUndefined()
      expect(mockState.scopeDisposers).toHaveLength(0)

      await asyncData.refresh({ cause: 'refresh:manual' })

      expect(asyncData.data.value).toEqual({ count: 6 })
      expect(asyncData.status.value).toBe('success')
      expect(requestFetch).toHaveBeenCalledTimes(1)
    }
    finally {
      asyncDataDefaults.value = previousValue
      asyncDataDefaults.errorValue = previousErrorValue
    }
  })

  it('ignores stale fallback results after dedupe cancel starts a newer request', async () => {
    let resolveFirstRequest: ((value: { count: number }) => void) | undefined
    const requestFetch = vi
      .fn()
      .mockImplementationOnce(() => new Promise<{ count: number }>((resolve) => {
        resolveFirstRequest = resolve
      }))
      .mockResolvedValueOnce({ count: 2 })

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(() => {
      throw new Error('outside of a nuxt instance')
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })
    const asyncData = await ajax.get<{ count: number }>('/hello', {}, {
      default: () => ({ count: 0 }),
      immediate: false
    })

    const firstExecute = asyncData.execute()
    const secondExecute = asyncData.execute()

    expect(requestFetch).toHaveBeenCalledTimes(2)

    const [, firstFetchOptions] = requestFetch.mock.calls[0] as [string, Record<string, any>]
    expect(firstFetchOptions.signal.aborted).toBe(true)

    await secondExecute
    expect(asyncData.data.value).toEqual({ count: 2 })

    resolveFirstRequest?.({ count: 1 })
    await firstExecute

    expect(asyncData.data.value).toEqual({ count: 2 })
    expect(asyncData.status.value).toBe('success')
  })

  it('returns fallback state to idle when an external signal aborts the request', async () => {
    let requestSignal: AbortSignal | undefined
    const requestFetch = vi.fn((_request, options) => new Promise((_resolve, reject) => {
      requestSignal = (options as Record<string, any>).signal as AbortSignal | undefined
      requestSignal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    }))
    const externalController = new AbortController()

    __setRequestFetchImpl(requestFetch)
    __setUseAsyncDataImpl(() => {
      throw new Error('outside of a plugin')
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })
    const asyncData = await ajax.get<string>('/hello', {}, {
      default: () => 'ready',
      immediate: false
    })

    const executePromise = asyncData.execute({ signal: externalController.signal })
    expect(asyncData.status.value).toBe('pending')

    externalController.abort()
    await executePromise

    expect(requestSignal?.aborted).toBe(true)
    expect(asyncData.data.value).toBe('ready')
    expect(asyncData.error.value).toBeUndefined()
    expect(asyncData.status.value).toBe('idle')
    expect(asyncData.pending.value).toBe(false)
  })

  it('rethrows non-fallback async-data errors on the client', async () => {
    __setUseAsyncDataImpl(() => {
      throw new Error('boom')
    })

    const ajax = new CustomFetch({
      baseURL: '/api',
      showLogs: false
    })

    expect(() => ajax.get('/hello')).toThrow('boom')
  })
})
