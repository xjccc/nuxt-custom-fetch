# Nuxt Module

简单封装 useAsyncData

## HTTPOptions

实例化全局 CustomFetch

```ts
{
  baseURL?: string
  paramsHandler?: (params: Record<any, string>) => Record<any, string>
  offline?: () => void
}
```

### baseURL

当前实例下的 baseURL

### paramsHandler

处理 params 的自定义函数

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

```js
import { hash } from 'ohash'
const key = hash(JSON.stringify(restConfig) + url)
```

### offline

客户端中，离线时调用(判断 navigator.onLine)

## ajax - 传参

### fetchOptions

```ts
interface fetchOptions {
  baseURL?: string
  key?: string
  body?: RequestInit['body'] | Record<string, any>
  useParamsHandler: HTTPConfig['paramsHandler']
  paramsHandler: HTTPConfig['paramsHandler']
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
  paramsHandler: (params = {}) => {
    params.aa = 111
    return params
  }
})

export const getInfo = (params: Record<any, string>) =>
  ajax.get<DataT>('/api/get-ip', { params }, options?: AsyncDataOptions<DataT>)
```

```ts
import { getInfo } from './ajax'

const { data, error, pending } = await getInfo({
  sign: 123
})
console.log(data.value)
```

## 注意

在 onMounted 中请求无效（version > 3.0.0）

- 在下一个 nextTick 中执行，或者设置{server: false}，watch pending 变化

## Development

- Run `npm run dev:prepare` to generate type stubs.
- Use `npm run dev` to start [playground](./playground) in development mode.
