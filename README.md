# Nuxt Custom Fetch

`nuxt-custom-fetch` is a Nuxt 4 wrapper built on top of the official async-data primitives. It keeps a shared request layer with interceptors, deterministic key generation, param/query preprocessing, and a client compatibility fallback for calls made after mount.

For new Nuxt 4 code, start with the official APIs first:

- `useFetch`
- `useAsyncData`
- `createUseFetch`
- `createUseAsyncData`
- `$fetch`

Use `CustomFetch` when you specifically need an extra request layer on top of those primitives, not as a replacement for them.

## Compatibility

- `v4`: Nuxt `>= 4.4.0`
- `v2`: Nuxt `3.0.0` to `3.16.x`

## Current Maintenance Summary

The current implementation is maintained around these guarantees:

- runtime behavior is aligned with Nuxt 4 async-data semantics where possible
- public method generics follow Nuxt `AsyncData` typing more closely
- reactive `key`, `baseURL`, `params`, `query`, `headers`, `body`, and `cache` values are resolved before each request
- generated keys include both `params` and `query`, which avoids stale client reuse when only one side changes
- same-key client compatibility requests share one async-data bucket, so `dedupe: 'cancel'` can abort the previous pending request
- Vitest runtime tests and TypeScript type tests cover the wrapper behavior

## When To Use This Module

`CustomFetch` is useful when you want:

- shared request and response interceptors
- deterministic hash-based request keys
- explicit `immutableKey` control
- param or query preprocessing through `handler`
- one request API that still works after mount on the client

If all you need is a typed composable with shared defaults, prefer Nuxt's official factories:

```ts
export const useAPI = createUseFetch({
  baseURL: '/api',
  lazy: true
})

export const useCachedData = createUseAsyncData({
  deep: false
})
```

## How It Works

- In `setup`, plugins, and other setup-compatible contexts, `CustomFetch` delegates back to `useAsyncData`.
- After mount on the client, or when `useAsyncData` is unavailable in the current context, it falls back to a compatibility mode.
- The compatibility mode still exposes `data`, `error`, `status`, `pending`, `refresh`, `execute`, and `clear`.
- The compatibility mode is not a full SSR payload or cache replacement.
- Calls that intentionally share the same `key` should keep `handler`, `deep`, `transform`, `pick`, `getCachedData`, and `default` consistent, matching Nuxt's keyed async-data rules.

## Installation

```bash
pnpm add nuxt-custom-fetch
```

Register the module in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-custom-fetch']
})
```

`CustomFetch` is auto-imported in Nuxt app code. In plain TypeScript helpers, importing it from `#imports` keeps editor support explicit.

## Quick Start

```ts
import { CustomFetch } from '#imports'

export const ajax = new CustomFetch({
  baseURL: '/api',
  showLogs: true,
  handler: input => input,
  offline: () => {
    console.warn('Device is offline')
  }
})

export const getUsers = () =>
  ajax.get<{ data: Array<{ id: number, name: string }> }>('/users')

export const createUser = (payload: { name: string }) =>
  ajax.post<{ id: number, name: string }>('/users', {
    body: payload
  })
```

Always `await` `ajax.get`, `ajax.post`, and `ajax.request` in setup-compatible code.

## Reactive Example

```ts
import { computed, ref } from 'vue'
import { CustomFetch } from '#imports'

const ajax = new CustomFetch({ baseURL: '/api' })

const page = ref(1)
const requestKey = computed(() => `list:${page.value}`)

const listState = await ajax.get<{
  data: number[]
  nums: number
}>('/get-list', {
  key: requestKey,
  params: { page }
}, {
  watch: [page],
  dedupe: 'cancel'
})

page.value++
await listState.refresh()
```

## Playground Real Examples

The playground examples now use one consistent set of scenario names and helper names. The shared helper file lives in [playground/api/index.ts](playground/api/index.ts).

```ts
export const getGreeting = (params: Record<string, unknown>) =>
  ajax.get<string>('/hello', { params })

export const getGreetingByUserId = (key: MaybeRefOrGetter<string>, { userId = 1 } = {}) =>
  ajax.get<string>('/hello', {
    key,
    params: { userId }
  }, {
    default: () => '11'
  })

export function getReactivePageList(page: Ref<number>) {
  return ajax.get<{ data: number[], nums: number }>('/get-list', {
    params: { page }
  }, {
    watch: [() => page.value]
  })
}
```

- Shared Greeting State: [playground/pages/example/v4-fetch.vue](playground/pages/example/v4-fetch.vue) and [playground/components/Test.vue](playground/components/Test.vue) use `getGreeting` to show that a page and a child component can share one keyed async-data bucket.
- Route-Driven Greeting: [playground/pages/example/v4-reactive-[id].vue](playground/pages/example/v4-reactive-%5Bid%5D.vue) uses `getGreetingByUserId` with a reactive key derived from the route.
- Reactive Page List: [playground/pages/example/reactive.vue](playground/pages/example/reactive.vue) uses `getReactivePageList` to show page-based refetching driven by a reactive page ref.
- Query Normalization: [playground/pages/example/handler.vue](playground/pages/example/handler.vue) shows how a `handler` can normalize and enrich list query parameters before the request is sent.
- Slow Metric Dedupe: [playground/pages/example/duplicate.vue](playground/pages/example/duplicate.vue) demonstrates same-key cancellation for repeated slow client requests with `dedupe: 'cancel'`.
- Manual Refresh & Clear: [playground/pages/example/test.vue](playground/pages/example/test.vue) uses `getGreeting` to compare `refresh()` and `clear()` across two independent keyed requests.

The remaining helper names follow the same rule: `getPageList` is the plain non-reactive list request, and `getDelayedPageMetric` is the intentionally slow metric request used for dedupe demonstrations.

## Request Semantics

### Key generation and dedupe

- Without an explicit `key`, the module hashes `url + method + resolved request options`.
- Both `params` and `query` participate in the generated key.
- `immutableKey: true` makes the generated key depend only on the URL.
- If you need exact cache control, provide your own `key`.
- Same key means shared async-data state.
- `dedupe: 'cancel'` aborts the previous in-flight request inside that shared state.
- `dedupe: 'defer'` reuses the existing pending request.

### Reactive inputs

- `key`, `baseURL`, `params`, `query`, `headers`, `body`, and `cache` can be refs, computed values, or getters.
- Reactive inputs are deeply resolved before every request.
- Use `watch` when you want a reactive source to trigger a refetch.

### Handler behavior

- `handler` receives a merged object built from `params` and `query`.
- If `query` is present, the processed output is written back to `query`.
- Otherwise the processed output is written back to `params`.
- Set `useHandler: false` on a request to bypass preprocessing.

### Client compatibility mode

- Client calls made after mount reuse existing same-key async-data state when available.
- If no Nuxt-managed keyed state exists yet, the module creates and caches a compatibility async-data instance by key.
- `refresh`, `execute`, `clear`, `watch`, status updates, and cancellation still work in this mode.
- This mode should not be treated as a full SSR payload cache replacement.

## Public API

```ts
const ajax = new CustomFetch({
  baseURL: '',
  immutableKey: false,
  showLogs: false,
  useHandler: true,
  handler: undefined,
  onRequest: undefined,
  onRequestError: undefined,
  onResponse: undefined,
  onResponseError: undefined,
  offline: undefined
})
```

Available methods:

- `ajax.get(url, config?, asyncDataOptions?)`
- `ajax.post(url, config?, asyncDataOptions?)`
- `ajax.request(url, { method, ...config }, asyncDataOptions?)`

The return value follows Nuxt's `AsyncData<...>` shape and can use the same `default`, `pick`, `transform`, `watch`, `dedupe`, and `timeout` options you already know from `useAsyncData`.

## Typing Notes

- `CustomFetch` mirrors Nuxt async-data generics closely enough for `default`, `pick`, and `transform` to narrow the final `data` type.
- Playground examples and type tests cover explicit generics, default values, and reactive arguments.
- If you want a custom wrapper with only shared defaults, Nuxt's `createUseFetch` and `createUseAsyncData` remain the simpler choice.

## Nuxt 4 API Reminders

- `useFetch` is the official shortcut for `useAsyncData + $fetch`.
- `$fetch` alone inside SSR setup will fetch twice during hydration unless it is wrapped by `useAsyncData` or replaced with `useFetch`.
- Relative `useFetch` calls on the server forward headers and cookies automatically. Plain `$fetch` does not.
- `dedupe`, `timeout`, `watch`, reactive keys, and `AbortSignal` are part of Nuxt's async-data contract.

## Development

- `pnpm dev:prepare` builds stubs and prepares the playground
- `pnpm dev` starts the playground
- `pnpm dev:build` builds the playground
- `pnpm test` runs the Vitest suite
- `pnpm run test:coverage` generates a coverage report
- `pnpm run test:types` runs TypeScript type checks

## References

- https://nuxt.com/docs/4.x/api/composables/create-use-async-data
- https://nuxt.com/docs/4.x/api/composables/create-use-fetch
- https://nuxt.com/docs/4.x/api/composables/use-async-data
- https://nuxt.com/docs/4.x/api/composables/use-fetch
- https://nuxt.com/docs/4.x/api/utils/dollarfetch
