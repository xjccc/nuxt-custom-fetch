# Nuxt Custom Fetch

A simple wrapper around Nuxt's `useAsyncData` to provide enhanced fetching capabilities with interceptors, request/response handling, and more.

## Version Compatibility

- `v4`: Compatible with Nuxt v3.17.0 or higher
- `v2`: Compatible with Nuxt v3.0.0 to v3.16.x

## Breaking Changes in v4

1. `http` method has been removed, use `request` instead

## Key Features

- Request lifecycle interceptors
- Automatic hash-based key generation
- Request parameter/query handling
- Response transformation
- Offline detection and handling
- Debug logs for requests
- Reactive fetching with `watch` support
- Request cancellation with abort controller

## Installation

```bash
npm install nuxt-custom-fetch
# or
yarn add nuxt-custom-fetch
# or
pnpm add nuxt-custom-fetch
```

Then add the module to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-custom-fetch']
})
```

## Basic Usage

Create a global CustomFetch instance:

```ts
const ajax = new CustomFetch({
  baseURL: 'https://api.example.com',
  // Optional configurations
  showLogs: true, // Show request logs in development
  immutableKey: false, // Enable to use only URL for generating cache keys
  // Optional request handler
  handler: (params) => {
    // Transform params/query before sending
    return params
  },
  // Optional offline handler
  offline: () => {
    // Handle offline status
    console.log('Device is offline')
  }
})

// Available methods
ajax.get('/api/users')
ajax.post('/api/users', { body: { name: 'John' } })
ajax.request('/api/users', { method: 'DELETE' })
```

## Important Notes

### Handling Requests in Client Components

1. When using in client components, execute in `nextTick`, or set `{server: false}` to properly handle status changes.

2. When using `refresh` and `execute` methods, note that parameters are not reactive, so they will always use the parameters from the first request.

3. If you pass a reactive object with `watch` enabled, it will automatically trigger new requests when the watched values change.

### Caching and Keys

The module generates hash-based keys for caching responses. You can:
- Provide your own `key` for precise cache control
- Enable `immutableKey` to use only the URL for generating cache keys (ignoring params/query)

## Configuration Options

### CustomFetch Constructor Options

```typescript
// Create a new instance with configuration
const ajax = new CustomFetch({
  baseURL: '', // Base URL for all requests
  immutableKey: false, // If true, only use URL for key generation (default: false)
  showLogs: true, // Show request logs (default: false in prod, true in dev)

  // Request handling
  useHandler: true, // Whether to use the handler function (default: true)
  handler: undefined, // Transform params/query before sending

  // Interceptors
  onRequest: undefined, // Before request is sent
  onRequestError: undefined, // When request error occurs
  onResponse: undefined, // After response is received
  onResponseError: undefined, // When response error occurs

  // Offline handling
  offline: undefined // Called when device is offline
})
```

### Request Method Options

All request methods accept these parameters:

```typescript
// Method signature example with proper TypeScript syntax
function exampleUsage<DataT, ErrorT> () {
  // These are the parameters you would use
  return ajax.get<DataT, ErrorT>(
    'https://api.example.com/endpoint', // URL (string)
    { // CustomFetchOptions (optional)
      params: { id: 123 }
    },
    { // AsyncDataOptions (optional)
      watch: ['someRef']
    }
  )
}
```

## Advanced Examples

### API Module Pattern

```ts
// api.ts
export const userApi = {
  getUser: (id: string) =>
    ajax.get<UserData>(`/api/users/${id}`),

  createUser: (userData: UserCreatePayload) =>
    ajax.post<UserData>('/api/users', { body: userData }),

  updateUser: (id: string, userData: UserUpdatePayload) =>
    ajax.request<UserData>(`/api/users/${id}`, {
      method: 'PUT',
      body: userData
    })
}
```

### Using in Components

```ts
// UserProfile.vue
import { userApi } from './api'

// Option 1: Using await
const { data: user, error, refresh } = await userApi.getUser('123')

// Option 2: Using without await
const { data: user, pending, error, refresh } = userApi.getUser('123')

// Using with reactive parameters and watch
const userId = ref('123')
const { data: user } = await userApi.getUser(userId.value, {}, {
  watch: [userId] // Will refetch when userId changes
})
```

## Types

For detailed type information, see the TypeScript definitions:

[use-async-data-type](https://nuxt.com/docs/api/composables/use-async-data#type)

### useAsyncDataType

```ts
export declare class CustomFetch {
  baseURL: string
  immutableKey: boolean
  offline: typeof Noop
  showLogs: boolean
  constructor (config: CustomFetchOptions)
  request<DataT, NuxtErrorDataT = Error | null>(url: NitroFetchRequest, config: CustomFetchOptions & {
    method: FetchMethod
  }, options?: AsyncDataOptions<DataT>): CustomFetchReturnValue<DataT, NuxtErrorDataT>
  get<DataT, NuxtErrorDataT = Error | null>(url: NitroFetchRequest, config?: CustomFetchOptions, options?: AsyncDataOptions<DataT>): CustomFetchReturnValue<DataT, NuxtErrorDataT>
  post<DataT, NuxtErrorDataT = Error | null>(url: NitroFetchRequest, config?: CustomFetchOptions, options?: AsyncDataOptions<DataT>): CustomFetchReturnValue<DataT, NuxtErrorDataT>
}

export type FetchMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CONNECT' | /* lowercase variants */ 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options' | 'trace' | 'connect' | undefined

export interface CustomFetchOptions extends Omit<FetchOptions, 'method'> {
  key?: MaybeRefOrGetter<string>
  immutableKey?: boolean
  showLogs?: boolean
  baseURL?: string
  useHandler?: boolean
  handler?: (mergedObject: FetchOptions['params'] & FetchOptions['query']) => Record<string, any>
  offline?: () => void
}
```

## Development

- Run `npm run dev:prepare` to generate type stubs
- Use `npm run dev` to start the playground in development mode
