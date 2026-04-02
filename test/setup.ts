import { __resetNuxtMocks } from './mocks/nuxt-imports'

beforeEach(() => {
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
