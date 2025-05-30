<template>
  <div
    class="container"
  >
    首页
    <Test />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { exampleApi } from '@/api'

const exampleRef = ref('')
const getExample = async () => {
  // data is the same as Test setup call
  const { data } = await exampleApi({})
  if (!data.value) {
    return
  }
  // exampleRef is not same
  exampleRef.value = data.value
  watch(
    /**
     * You will see logs in browser console
     * 2s log exampleRef value is 221
     * 3s log exampleRef value is 235
     * because data is the same ref
     */
    () => data.value,
    (newVal) => {
      exampleRef.value = newVal || ''
    }
  )
}

await getExample()

const exampleRef2 = ref('')
const getExample2 = async () => {
  const { data } = await exampleApi({})
  if (!data.value) {
    return
  }
  exampleRef2.value = data.value
  console.log('exampleRef2', exampleRef2.value)
}

watch(
  () => exampleRef.value,
  (newVal) => {
    console.log('exampleRef', newVal)
  },
  { immediate: true }
)
onMounted(async () => {
  await nextTick()
  /**
   * If getExample is called in setup
   * This api will not called in network at client
   * This will cached the same data
   *
   * If none used in setup
   * This will be called in network at client
   * And this api use $fetch to fetch data
   * Its compat with useAsyncData, and not same as useAsyncData, like refresh\execute
   */
  getExample2()
  setTimeout(() => {
    exampleRef.value = '235'
  }, 3000)
})
</script>

<style lang="less" scoped>

</style>
