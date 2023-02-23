import { defineNuxtConfig } from 'nuxt/config'
import MyModule from '..'

export default defineNuxtConfig({
  modules: [
    MyModule
  ],
  nitro: {
    devProxy: {
      '/proxy/cms': { target: 'https://cms-api-test.360che.com', changeOrigin: true }
    }
  }
})
