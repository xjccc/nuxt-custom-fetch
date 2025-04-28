import type { Ref } from '#imports'
import { CustomFetch } from '#imports'

const ajax = new CustomFetch({ baseURL: '/api' })

export const exampleApi = (params: Record<string, unknown>) =>
  ajax.get<string>('/hello', {
    params
  })

export const exampleApi2 = (key: string | Ref<string>, {
  userId = 1
}) => {
  return ajax.get<string>('/hello', {
    key,
    params: {
      userId
    }
  }, {
    default: () => 11
  })
}
export function getListReactive (page: Ref<number>) {
  return ajax.get<{
    data: number[]
    nums: number
  }>('/get-list', { params: { page } }, { watch: [() => page.value] })
}

export function getList (page: number) {
  return ajax.get<{
    data: number[]
    nums: number
  }>('/get-list', { params: { page } })
}

export function getNum (page: number) {
  return ajax.get<{
    data: number[]
    nums: number
  }>('/get-num', { params: { page } })
}
