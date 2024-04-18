# Nuxt Module

简单封装 useAsyncData

## 注意

请求的使用形式，类似于之前的`ajax`，修改参数后，重新调用封装方法。

1. 在 onMounted 中请求无效（version > 3.0.0）

- 在下一个 nextTick 中执行，或者设置{server: false}，watch pending 变化

2. `refresh`和`execute`使用上也需要注意，参数不是响应式的，所以会一直是第一次请求的参数

3. 如果传入响应式对象，使用`watch`监听，会自动重新请求


## HTTPOptions

实例化全局 CustomFetch

```ts
{
  baseURL?: string
  handler?: (params: Record<string, any>) => Record<string, any>
  offline?: () => void
}
```

### baseURL

当前实例下的 baseURL

### handler

处理 query & params 的自定义函数

```ts
{
  handler({...query, ...params}) {
    return {}
  }
}
```

### 请求-响应拦截

```ts
{
  onRequest?: ({ request, options }: {
    request: FetchRequest
    options: FetchOptions
  }) => void
  onRequestError?: ({
    request,
    options,
    error
  }: {
    request: FetchRequest
    options: FetchOptions
    error: FetchError
  }) => void
  onResponse?: ({
    request,
    response,
    options
  }: {
    request: FetchRequest
    options: FetchOptions
    response: FetchResponse<any>
  }) => Promise<void> | void
  onResponseError?: ({
    request,
    response,
    options
  }: {
    request: FetchRequest
    options: FetchOptions
    response: FetchResponse<any>
  }) => void
}
```

## 实例方法

`http|get|post`

### offline

客户端中，离线时调用(判断 navigator.onLine)

## ajax - 传参

### fetchOptions

```ts
interface fetchOptions {
  baseURL?: string
  key?: string
  body?: RequestInit['body'] | Record<string, any>
  useHandler: HTTPConfig['useHandler']
  handler: HTTPConfig['handler']
  params?: SearchParameters
  query?: SearchParameters
  parseResponse?: (responseText: string) => any
  responseType?: R
  response?: boolean
  retry?: number | false
  onRequest?(context: FetchContext): Promise<void> | void
  onRequestError?(
    context: FetchContext & {
      error: Error
    }
  ): Promise<void> | void
  onResponse?(
    context: FetchContext & {
      response: FetchResponse<R>
    }
  ): Promise<void> | void
  onResponseError?(
    context: FetchContext & {
      response: FetchResponse<R>
    }
  ): Promise<void> | void
}
```

### Type

[type](https://nuxt.com/docs/api/composables/use-async-data#type)

## 使用方式

```bash
pnpm add nuxt-custom-fetch
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-custom-fetch']
})

// ajax.ts文件
import type { FetchOptions } from 'ofetch'
const ajax = new CustomFetch({
  baseURL: '',
  // 全局处理query\params的方法
  handler: (params = {}) => {
    params.aa = 111
    return params
  }
})

export const getInfo = (params: Record<string, any>) =>
  ajax.get<DataT>('/api/get-ip', { params }, options?: AsyncDataOptions<DataT>)
```

```ts
import { getInfo } from './ajax'

const { data, error, pending } = await getInfo({
  sign: 123
})
console.log(data.value)
```

## Development

- Run `npm run dev:prepare` to generate type stubs.
- Use `npm run dev` to start [playground](./playground) in development mode.
