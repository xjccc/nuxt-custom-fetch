# Nuxt Module

简单封装 useAsyncData

## HTTPOptions

实例化全局 CustomFetch

```
baseURL?: string
paramsHandler?: (params: FetchOptions['params']) => FetchOptions & HTTPConfig
extraParams?: string[]
offline?: () => void
```

### baseURL

当前实例下的 baseURL

### paramsHandler

处理 params 的自定义函数

### extraParams

排除在 params 中的 key（用于生成\$fetch 所需要的唯一 key）
类型: string[]

### 请求-响应拦截

```
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
```

## 实例方法

### http

### get

### post

```js
import { hash } from 'ohash'
const key = hash(JSON.stringify(restConfig) + url)
```

### offline

客户端中，离线时调用(判断 navigator.onLine)

## ajax - 传参

### fetchOptions

```
baseURL?: string;
key?: string;
body?: RequestInit["body"] | Record<string, any>;
useParamsHandler: HTTPConfig['paramsHandler'];
paramsHandler: HTTPConfig['paramsHandler'];
params?: SearchParameters;
query?: SearchParameters;
parseResponse?: (responseText: string) => any;
responseType?: R;
response?: boolean;
retry?: number | false;
onRequest?(context: FetchContext): Promise<void> | void;
onRequestError?(context: FetchContext & {
    error: Error;
}): Promise<void> | void;
onResponse?(context: FetchContext & {
    response: FetchResponse<R>;
}): Promise<void> | void;
onResponseError?(context: FetchContext & {
    response: FetchResponse<R>;
}): Promise<void> | void;
```

### AsyncDataOptions<DataT>

```
server?: boolean;
lazy?: boolean;
default?: () => DataT | Ref<DataT> | null;
transform?: Transform;
pick?: PickKeys;
watch?: MultiWatchSources;
immediate?: boolean;
```

## 使用方式

```ts
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

export const getInfo = (params: FetchOptions['params']) =>
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
