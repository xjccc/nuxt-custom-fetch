import type { Ref } from '#imports'
import type { getDelayedPageMetric, getGreeting, getGreetingByUserId, getPageList, getReactivePageList } from '../playground/api'
import { ref } from '#imports'
import { CustomFetch } from '../src/runtime/ajax'

interface CreateResponse {
  created: boolean
  id: string
}

interface ListResponse {
  data: number[]
  nums: number
}

const ajax = new CustomFetch({ baseURL: '/api' })
const _getString = ajax.get<string>

function _getGreetingRequest (params: Record<string, unknown>) {
  return ajax.get<string>('/hello', {
    params
  })
}

function _getListRequest () {
  return ajax.get<ListResponse>('/get-list', {
    baseURL: ref('/proxy'),
    headers: {
      authorization: ref('Bearer token')
    },
    params: {
      page: ref(1)
    }
  })
}

function _createItemRequest () {
  return ajax.post<CreateResponse>('/items', {
    body: {
      name: ref('Ada')
    },
    key: ref('items:create')
  })
}

function _getStringWithDefault () {
  return ajax.get<string>('/hello', {}, {
    default: () => 'ready'
  })
}

function _getStringWithRefDefault () {
  return ajax.get<string>('/hello', {}, {
    default: () => ref('ready')
  })
}

function _getPickedListRequest () {
  return ajax.get<ListResponse, Error | null, ListResponse, ['nums']>('/get-list', {}, {
    pick: ['nums']
  })
}

function _getTransformedStringRequest () {
  return ajax.get<string, Error | null, { size: number }>('/hello', {}, {
    transform: value => ({
      size: value.length
    })
  })
}

function _getTransformedStringWithDefault () {
  return ajax.get<string, Error | null, { size: number }, ['size'], { size: number }>('/hello', {}, {
    default: () => ({ size: 0 }),
    pick: ['size'],
    transform: value => ({
      size: value.length
    })
  })
}

type GreetingRequestState = Awaited<ReturnType<typeof _getGreetingRequest>>
type GetListState = Awaited<ReturnType<typeof _getListRequest>>
type CreateItemState = Awaited<ReturnType<typeof _createItemRequest>>
type GetStringWithDefaultState = Awaited<ReturnType<typeof _getStringWithDefault>>
type GetStringWithRefDefaultState = Awaited<ReturnType<typeof _getStringWithRefDefault>>
type GetPickedListState = Awaited<ReturnType<typeof _getPickedListRequest>>
type GetTransformedStringState = Awaited<ReturnType<typeof _getTransformedStringRequest>>
type GetTransformedStringWithDefaultState = Awaited<ReturnType<typeof _getTransformedStringWithDefault>>
type GetStringConfig = NonNullable<Parameters<typeof _getString>[1]>
type PlaygroundGreetingState = Awaited<ReturnType<typeof getGreeting>>
type PlaygroundGreetingByUserIdState = Awaited<ReturnType<typeof getGreetingByUserId>>
type PlaygroundPageListState = Awaited<ReturnType<typeof getPageList>>
type PlaygroundReactivePageListState = Awaited<ReturnType<typeof getReactivePageList>>
type PlaygroundDelayedPageMetricState = Awaited<ReturnType<typeof getDelayedPageMetric>>
type GreetingParams = Parameters<typeof getGreeting>[0]
type GreetingByUserIdKey = Parameters<typeof getGreetingByUserId>[0]
type GreetingByUserIdPayload = Parameters<typeof getGreetingByUserId>[1]
type PageListParam = Parameters<typeof getPageList>[0]
type ReactivePageListParam = Parameters<typeof getReactivePageList>[0]
type DelayedPageMetricParam = Parameters<typeof getDelayedPageMetric>[0]

describe('customFetch types', () => {
  it('infers helper return data type like playground api usage', () => {
    expectTypeOf<GreetingRequestState['data']['value']>().toEqualTypeOf<string | undefined>()
  })

  it('infers object response shape for get requests', () => {
    expectTypeOf<GetListState['data']['value']>().toEqualTypeOf<ListResponse | undefined>()
    expectTypeOf<NonNullable<GetListState['data']['value']>['nums']>().toEqualTypeOf<number>()
    expectTypeOf<NonNullable<GetListState['data']['value']>['data']>().toEqualTypeOf<number[]>()
  })

  it('infers object response shape for post requests', () => {
    expectTypeOf<CreateItemState['data']['value']>().toEqualTypeOf<CreateResponse | undefined>()
    expectTypeOf<CreateItemState['refresh']>().toBeFunction()
    expectTypeOf<CreateItemState['execute']>().toBeFunction()
    expectTypeOf<CreateItemState['clear']>().toBeFunction()
    expectTypeOf<CreateItemState['status']['value']>().toEqualTypeOf<'idle' | 'pending' | 'success' | 'error'>()
  })

  it('narrows return data when default or pick is provided', () => {
    expectTypeOf<GetStringWithDefaultState['data']['value']>().toEqualTypeOf<string>()
    expectTypeOf<GetStringWithRefDefaultState['data']['value']>().toEqualTypeOf<string>()
    expectTypeOf<GetPickedListState['data']['value']>().toEqualTypeOf<{ nums: number } | undefined>()
  })

  it('preserves transformed data types across default and pick combinations', () => {
    expectTypeOf<GetTransformedStringState['data']['value']>().toEqualTypeOf<{ size: number } | undefined>()
    expectTypeOf<GetTransformedStringWithDefaultState['data']['value']>().toEqualTypeOf<{ size: number }>()
  })

  it('accepts reactive request config values', () => {
    void ({
      baseURL: ref('/proxy'),
      key: ref('hello:key'),
      headers: {
        authorization: ref('Bearer token')
      }
    } satisfies GetStringConfig)
  })

  it('rejects invalid request config types at compile time', () => {
    // @ts-expect-error baseURL must resolve to string
    void ({ baseURL: 123 } satisfies GetStringConfig)

    // @ts-expect-error header values must resolve to string
    void ({ headers: { authorization: 123 } } satisfies GetStringConfig)

    // @ts-expect-error key must resolve to string
    void ({ key: ref(123) } satisfies GetStringConfig)

    expectTypeOf<GetStringConfig>().toMatchTypeOf<GetStringConfig>()
  })

  it('preserves playground helper return types', () => {
    expectTypeOf<PlaygroundGreetingState['data']['value']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<PlaygroundGreetingByUserIdState['data']['value']>().toEqualTypeOf<string>()
    expectTypeOf<PlaygroundPageListState['data']['value']>().toEqualTypeOf<ListResponse | undefined>()
    expectTypeOf<PlaygroundReactivePageListState['data']['value']>().toEqualTypeOf<ListResponse | undefined>()
    expectTypeOf<PlaygroundDelayedPageMetricState['data']['value']>().toEqualTypeOf<ListResponse | undefined>()
  })

  it('enforces playground helper parameter types', () => {
    void ({ userId: 1 } satisfies GreetingParams)
    void ([ref('user-key'), { userId: 1 }] satisfies [GreetingByUserIdKey, GreetingByUserIdPayload])
    void ([ref('user-key'), { userId: ref(1) }] satisfies [GreetingByUserIdKey, GreetingByUserIdPayload])
    void ([() => 'user-key', { userId: () => 1 }] satisfies [GreetingByUserIdKey, GreetingByUserIdPayload])
    void (1 satisfies PageListParam)
    void (ref(1) satisfies ReactivePageListParam)
    void (1 satisfies DelayedPageMetricParam)

    // @ts-expect-error getGreeting params should be an object
    void ('hello' satisfies GreetingParams)

    // @ts-expect-error getGreetingByUserId key must resolve to string
    void ([ref(123), { userId: 1 }] satisfies [GreetingByUserIdKey, GreetingByUserIdPayload])

    // @ts-expect-error getGreetingByUserId userId must resolve to number
    void ([ref('user-key'), { userId: '1' }] satisfies [GreetingByUserIdKey, GreetingByUserIdPayload])

    // @ts-expect-error getPageList expects a number
    void (ref(1) satisfies PageListParam)

    // @ts-expect-error getReactivePageList expects Ref<number>
    void (1 satisfies ReactivePageListParam)

    // @ts-expect-error getDelayedPageMetric expects a number
    void (ref(1) satisfies DelayedPageMetricParam)

    expectTypeOf<ReactivePageListParam>().toEqualTypeOf<Ref<number>>()
  })
})
