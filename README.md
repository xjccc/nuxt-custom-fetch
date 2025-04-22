# Nuxt Module

simple wrapper useAsyncData

`version >= 3.17.0`

## Attention

1. Invalid request in onMounted

- Execute in `nextTick`, or set `{server: false}` to watch `status` changes

2. When using `refresh` and `execute`, it should also be noted that the parameters are not responsive, so they will always be the parameters requested for the first time

3. If a reactive object is passed and using `watch`, it will automatically re request

## Install

```bash
pnpm add nuxt-custom-fetch
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-custom-fetch']
})
```

## Usage

global CustomFetch

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

## Types

### useAsyncDataType

[use-async-data-type](https://nuxt.com/docs/api/composables/use-async-data#type)

```ts
export declare class CustomFetch {
  baseURL: string
  immutableKey: boolean
  offline: typeof Noop
  showLogs: boolean
  constructor (config: CustomFetchOptions)
  http<DataT, NuxtErrorDataT = Error | null>(url: NitroFetchRequest, config: CustomFetchOptions & {
    method: FetchMethod
  }, options?: AsyncDataOptions<DataT>): CustomFetchReturnValue<DataT, NuxtErrorDataT>
  get<DataT, NuxtErrorDataT = Error | null>(url: NitroFetchRequest, config?: CustomFetchOptions, options?: AsyncDataOptions<DataT>): CustomFetchReturnValue<DataT, NuxtErrorDataT>
  post<DataT, NuxtErrorDataT = Error | null>(url: NitroFetchRequest, config?: CustomFetchOptions, options?: AsyncDataOptions<DataT>): CustomFetchReturnValue<DataT, NuxtErrorDataT>
}

export type FetchMethod = 'options' | 'GET' | 'POST' | 'get' | 'HEAD' | 'PATCH' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'post' | 'head' | 'patch' | 'put' | 'delete' | 'connect' | 'trace' | undefined
export interface CustomFetchOptions extends Omit<FetchOptions, 'method'> {
  /** unique key for fetch */
  key?: string
  /** hash key for fetch, with [customFetch: + url] without query */
  immutableKey?: boolean
  /** show logs */
  showLogs?: boolean
  baseURL?: string
  /** is use handler to deal with query or pramas */
  useHandler?: boolean
  /** handler to deal with query or pramas */
  handler?: (mergedObject: FetchOptions['params'] & FetchOptions['query']) => Record<string, any>
  /** offline handler */
  offline?: () => void
}
export interface Interceptors {
  onRequest?: FetchOptions['onRequest']
  onRequestError?: FetchOptions['onRequestError']
  onResponse?: FetchOptions['onResponse']
  onResponseError?: FetchOptions['onResponseError']
}
```

## Example

```ts
// api.ts
export const getInfo = (params: Record<string, any>) =>
  ajax.get<DataT>('/api/get-ip', { params }, {})
```

```ts
// index.vue
import { getInfo } from './ajax'
const { data, error } = await getInfo({
  sign: 123
})
console.log(data.value)
```

## Development

- Run `npm run dev:prepare` to generate type stubs.
- Use `npm run dev` to start [playground](./playground) in development mode.
