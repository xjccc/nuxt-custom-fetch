import { ref } from '#imports'
import { hash } from 'ohash'
import { generateOptionSegments, Noop, pick, resolveReactiveValue } from '../src/runtime/utils'

describe('noop', () => {
  it('does nothing', () => {
    expect(Noop()).toBeUndefined()
  })
})

describe('resolveReactiveValue', () => {
  it('deeply unwraps refs in arrays and plain objects', () => {
    const payload = {
      user: ref('Ada'),
      nested: {
        count: ref(2)
      },
      tags: [ref('nuxt'), { ok: ref(true) }]
    }

    expect(resolveReactiveValue(payload)).toEqual({
      user: 'Ada',
      nested: {
        count: 2
      },
      tags: ['nuxt', { ok: true }]
    })
  })

  it('preserves special platform objects', () => {
    const formData = new FormData()
    formData.append('name', 'Ada')

    expect(resolveReactiveValue(formData)).toBe(formData)
  })

  it('does not throw when optional web constructors are unavailable', () => {
    vi.stubGlobal('Blob', undefined)
    vi.stubGlobal('File', undefined)
    vi.stubGlobal('FormData', undefined)
    vi.stubGlobal('Headers', undefined)
    vi.stubGlobal('Request', undefined)
    vi.stubGlobal('URLSearchParams', undefined)

    try {
      expect(() => resolveReactiveValue(new Date())).not.toThrow()
    }
    finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('generateOptionSegments', () => {
  it('uses GET as the default method when method is missing', () => {
    const segments = generateOptionSegments({
      query: {
        q: ref('nuxt')
      }
    } as never)

    expect(segments).toEqual([
      'GET',
      undefined,
      {
        q: 'nuxt'
      }
    ])
  })

  it('normalizes method, baseURL and params values', () => {
    const segments = generateOptionSegments({
      method: ref('post'),
      baseURL: ref('/api'),
      params: {
        page: ref(2),
        filter: 'latest'
      }
    })

    expect(segments).toEqual([
      'POST',
      '/api',
      {
        page: 2,
        filter: 'latest'
      }
    ])
  })

  it('includes both params and query in key segments', () => {
    const segments = generateOptionSegments({
      method: 'GET',
      baseURL: '/api',
      params: {
        type: 'params'
      },
      query: {
        page: ref(2),
        type: 'params'
      }
    })

    expect(segments).toEqual([
      'GET',
      '/api',
      {
        type: 'params'
      },
      {
        page: 2,
        type: 'params'
      }
    ])
  })

  it('deeply unwraps nested reactive params and query values', () => {
    const segments = generateOptionSegments({
      method: 'GET',
      params: {
        filters: {
          page: ref(2),
          tags: [ref('latest')]
        }
      },
      query: {
        cursor: {
          after: ref('abc')
        }
      }
    })

    expect(segments).toEqual([
      'GET',
      undefined,
      {
        filters: {
          page: 2,
          tags: ['latest']
        }
      },
      {
        cursor: {
          after: 'abc'
        }
      }
    ])
  })

  it('hashes plain object bodies after deep unwrapping refs', () => {
    const body = {
      profile: {
        name: ref('Ada')
      },
      tags: [ref('nuxt')]
    }

    const segments = generateOptionSegments({
      method: 'POST',
      body
    })

    expect(segments.at(-1)).toBe(hash(resolveReactiveValue(body)))
  })

  it('hashes array buffer bodies deterministically', () => {
    const body = new Uint8Array([1, 2, 3]).buffer

    const segments = generateOptionSegments({
      method: 'POST',
      body
    })

    expect(segments.at(-1)).toBe(hash({
      0: '1',
      1: '2',
      2: '3'
    }))
  })

  it('hashes FormData bodies by entry values', () => {
    const body = new FormData()
    body.append('name', 'Ada')

    const segments = generateOptionSegments({
      method: 'POST',
      body
    })

    expect(segments.at(-1)).toBe(hash({
      name: 'Ada'
    }))
  })

  it('hashes truthy primitive bodies directly', () => {
    const segments = generateOptionSegments({
      method: 'POST',
      body: () => 'payload'
    })

    expect(segments.at(-1)).toBe(hash('payload'))
  })

  it('hashes falsy body values returned by getters', () => {
    const segments = generateOptionSegments({
      method: 'POST',
      body: () => ''
    })

    expect(segments.at(-1)).toBe(hash(''))
  })

  it('hashes direct falsy body values', () => {
    expect(generateOptionSegments({
      method: 'POST',
      body: ''
    }).at(-1)).toBe(hash(''))

    expect(generateOptionSegments({
      method: 'POST',
      body: 0 as any
    }).at(-1)).toBe(hash(0))

    expect(generateOptionSegments({
      method: 'POST',
      body: false as any
    }).at(-1)).toBe(hash(false))
  })

  it('does not throw when body hashing runs without optional web constructors', () => {
    vi.stubGlobal('FormData', undefined)
    vi.stubGlobal('File', undefined)

    try {
      expect(generateOptionSegments({
        method: 'POST',
        body: 'payload'
      }).at(-1)).toBe(hash('payload'))
    }
    finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('pick', () => {
  it('returns only selected keys', () => {
    expect(pick({
      a: 1,
      b: 2,
      c: 3
    }, ['a', 'c'])).toEqual({
      a: 1,
      c: 3
    })
  })
})
