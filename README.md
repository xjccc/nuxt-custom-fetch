# Nuxt Module

简单封装 useAsyncData

`version > 3.0.0`

## 注意

请求的使用形式，类似于之前的`ajax`，修改参数后，重新调用封装方法。

1. 在 onMounted 中请求无效（version > 3.0.0）

- 在下一个 nextTick 中执行，或者设置{server: false}，watch pending 变化

2. `refresh`和`execute`使用上也需要注意，参数不是响应式的，所以会一直是第一次请求的参数

3. 如果传入响应式对象，使用`watch`监听，会自动重新请求

## 安装

```bash
pnpm add nuxt-custom-fetch
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-custom-fetch']
})
```

## 使用

实例化全局 CustomFetch

```ts
const ajax = new CustomFetch({
  baseURL: ''
})

// `http|get|post`
ajax.get('/api/user')

ajax.post('/api/user')

ajax.http({
  method: 'GET'
})
```

## 类型

### useAsyncDataType

[use-async-data-type](https://nuxt.com/docs/api/composables/use-async-data#type)

```ts
export declare class CustomFetch {
  baseURL: any
  immutableKey: boolean
  params: HTTPConfig
  baseHandler: HTTPConfig['handler']
  interceptors: Interceptors
  offline: typeof Noop
  constructor(config?: HTTPConfig)
  private baseConfig
  http<DataT, ErrorT = Error | null>(url: NitroFetchRequest, config: HTTPConfig & {
    method: FetchMethod
  }, options?: AsyncDataOptions<DataT>): CustomFetchReturnValue<DataT, ErrorT>
  get<DataT, ErrorT = Error | null>(url: NitroFetchRequest, config?: HTTPConfig, options?: AsyncDataOptions<DataT>): CustomFetchReturnValue<DataT, ErrorT>
  post<DataT, ErrorT = Error | null>(url: NitroFetchRequest, config?: HTTPConfig, options?: AsyncDataOptions<DataT>): CustomFetchReturnValue<DataT, ErrorT>
}

export interface OnRequestType {
  request: FetchRequest
  options: FetchOptions
}
export interface OnRequestErrorType {
  request: FetchRequest
  options: FetchOptions
  error: FetchError
}
export interface OnResponseType {
  request: FetchRequest
  options: FetchOptions
  response: FetchResponse<any>
}
export interface OnResponseErrorType {
  request: FetchRequest
  options: FetchOptions
  response: FetchResponse<any>
}
export type FetchMethod = 'options' | 'GET' | 'POST' | 'get' | 'HEAD' | 'PATCH' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'post' | 'head' | 'patch' | 'put' | 'delete' | 'connect' | 'trace' | undefined
export interface HTTPConfig extends Omit<FetchOptions, 'method'> {
  key?: string
  immutableKey?: boolean
  baseURL?: string
  useHandler?: boolean
  handler?: (params: Record<string, any>) => Record<string, any>
  offline?: () => void
}
export interface Interceptors {
  onRequest?: FetchOptions['onRequest']
  onRequestError?: FetchOptions['onRequestError']
  onResponse?: FetchOptions['onResponse']
  onResponseError?: FetchOptions['onResponseError']
}
```

## 示例

```ts
// api.ts
export const getInfo = (params: Record<string, any>) =>
  ajax.get<DataT>('/api/get-ip', { params }, {})
```

```ts
// index.vue
import { getInfo } from './ajax'
const { data, error, pending } = await getInfo({
  sign: 123
})
console.log(data.value)
```

## Development

- Run `npm run dev:prepare` to generate type stubs.
- Use `npm run dev` to start [playground](./playground) in development mode.
