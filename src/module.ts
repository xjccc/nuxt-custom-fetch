import { fileURLToPath } from 'url'
import { defineNuxtModule, createResolver, addImports } from '@nuxt/kit'

export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-custom-fetch',
    configKey: 'customFetch'
  },
  defaults: {},
  setup (options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))
    nuxt.options.build.transpile.push(runtimeDir)
    addImports({
      from: resolve(runtimeDir, 'ajax'),
      name: 'CustomFetch'
    })
  }
})
