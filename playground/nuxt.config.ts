import { defineNuxtConfig } from 'nuxt/config'
import MyModule from '../src/module'

export default defineNuxtConfig({
  modules: [
    MyModule
  ],

  // ssr: false,
  vite: { server: { fs: { allow: ['../../../node_modules/'] } } },

  nitro: {
    devProxy: {
      '/proxy/cms': {
        target: 'https://cms-api-test.360che.com',
        changeOrigin: true
      }
    }
  },

  compatibilityDate: '2024-12-03'
})
