<template>
  <div
    class="container"
  >
    首页
    <Test />
  </div>
</template>

<script setup lang="ts">
import { exampleApi } from '@/api'
import { nextTick, onMounted, ref, watch } from 'vue'

const exampleRef = ref('')
const getExample = async () => {
  const { data } = await exampleApi({})
  if (!data.value) {
    return
  }
  exampleRef.value = data.value
  watch(
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
  getExample2()
  setTimeout(() => {
    exampleRef.value = '235'
  }, 3000)
})
</script>

<style lang="less" scoped>

</style>
