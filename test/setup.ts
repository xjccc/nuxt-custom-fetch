import { __resetCustomFetchCaches } from '../src/runtime/ajax'
import { __resetNuxtMocks } from './mocks/nuxt-imports'

beforeEach(() => {
  __resetCustomFetchCaches()
  __resetNuxtMocks()

  if (!('navigator' in globalThis)) {
    vi.stubGlobal('navigator', {})
  }

  Object.defineProperty(globalThis.navigator, 'onLine', {
    configurable: true,
    value: true
  })

  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
