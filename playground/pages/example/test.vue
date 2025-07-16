<template>
  <div class="container">
    测试一下
    <button @click="refreshNuxtData">
      刷新
    </button>
    <button @click="clearData">
      清除
    </button>
  </div>
</template>

<script setup lang="ts">
import { exampleApi } from '@/api'

const { data, clear, refresh } = await exampleApi({
  userId: 1,
  name: 'test'
})
console.log(data.value)
const refreshNuxtData = async () => {
  await refresh()
  console.log(data.value)
}
const clearData = () => {
  clear()
  console.log(data.value)
}
const { data: data1 } = await exampleApi({
  userId: 2,
  name: 'test'
})
console.log(data1.value)
</script>

<style scoped>
</style>
