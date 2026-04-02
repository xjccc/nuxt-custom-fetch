import { fileURLToPath } from 'node:url'

export default {
  define: {
    'import.meta.client': true,
    'import.meta.dev': true
  },
  resolve: {
    alias: {
      '#imports': fileURLToPath(new URL('./test/mocks/nuxt-imports.ts', import.meta.url)),
      '#build/nuxt.config.mjs': fileURLToPath(new URL('./test/mocks/nuxt-config.ts', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/runtime/**/*.ts']
    }
  }
}
