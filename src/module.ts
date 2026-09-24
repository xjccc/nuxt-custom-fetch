import type { NuxtModule } from 'nuxt/schema'
import { fileURLToPath } from 'node:url'
import { addImports, createResolver, defineNuxtModule } from '@nuxt/kit'

export interface ModuleOptions {}

// Explicit type keeps the emitted declaration portable (TS2883 with Nuxt 4.5 types).
const nuxtCustomFetch: NuxtModule<ModuleOptions, ModuleOptions, false> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-custom-fetch',
    configKey: 'customFetch',
    version: '>=4.5.0'
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

export default nuxtCustomFetch
