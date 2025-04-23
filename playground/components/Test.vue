<template>
  <div
    class="container"
    :name="1"
  >
    hello-world
  </div>
</template>

<script setup lang="ts">
import { exampleApi } from '@/api'

const { data } = await exampleApi({})
setTimeout(() => {
  data.value = '221'
}, 2000)
</script>

<style lang="less" scoped></style>
