/* eslint-disable import/no-mutable-exports -- test mock mirrors Nuxt's mutable virtual config flags */
export const asyncDataDefaults: {
  value: unknown
  errorValue: unknown
} = {
  value: undefined,
  errorValue: undefined
}

export let pendingWhenIdle = false
export let granularCachedData = true
export let purgeCachedData = true

export function __setPendingWhenIdle (value: boolean) {
  pendingWhenIdle = value
}

export function __setGranularCachedData (value: boolean) {
  granularCachedData = value
}

export function __setPurgeCachedData (value: boolean) {
  purgeCachedData = value
}
