import { CustomFetch, watch, type Ref } from '#imports'
const ajax = new CustomFetch({
  baseURL: '/api'
})

export const getListReactive = (page: Ref<number>) => {
  return ajax.get<{
    data: number[],
    nums: number
  }>('/get-list', {
    params: {
      page
    }
  }, { watch: [() => page.value] })
}

export const getList = (page: number) => {
  return ajax.get<{
    data: number[],
    nums: number
  }>('/get-list', {
    params: {
      page
    }
  })
}

export const getNum = (page: number) => {
  return ajax.get<{
    data: number[],
    nums: number
  }>('/get-num', {
    params: {
      page
    }
  })
}
