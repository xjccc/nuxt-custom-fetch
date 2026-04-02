import type { MaybeRefOrGetter, Ref } from '#imports'
import { CustomFetch } from '#imports'

const ajax = new CustomFetch({ baseURL: '/api' })

export const getGreeting = (params: Record<string, unknown>) =>
  ajax.get<string>('/hello', {
    params
  })

export const getGreetingByUserId = (key: MaybeRefOrGetter<string>, {
  userId = 1
}: {
  userId?: MaybeRefOrGetter<number>
}) => {
  return ajax.get<string>('/hello', {
    key,
    params: {
      userId
    }
  }, {
    default: () => '11'
  })
}

export function getReactivePageList (page: Ref<number>) {
  return ajax.get<{
    data: number[]
    nums: number
  }>('/get-list', { params: { page } }, { watch: [() => page.value] })
}

export function getPageList (page: number) {
  return ajax.get<{
    data: number[]
    nums: number
  }>('/get-list', { params: { page } })
}

export function getDelayedPageMetric (page: number) {
  return ajax.get<{
    data: number[]
    nums: number
  }>('/get-num', { params: { page } })
}
