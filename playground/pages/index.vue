<template>
  <div class="container">
    主页
    {{ list?.totalpage }}
    <br>
    <NuxtLink to="/test-reactive">
      Test reactive
    </NuxtLink>
    <br>
    <NuxtLink to="/test-duplicate">
      Test duplicate
    </NuxtLink>
    <br>
    <NuxtLink to="/test-handler">
      Test handler
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { ArticleInfo } from '../api/ajax'
import { nextTick, onMounted, ref } from 'vue'
import { getArticleListData } from '../api/ajax'
// const { data, error, pending } = await getInfo<{ip: string}>({
//   sign: 123,
//   sign_time: 'aaa'
// })
// console.log(data.value, process.server)
const list = ref<Partial<ArticleInfo>>()
const getApi = async () => {
  const { data, error } = await getArticleListData({
    SubId: 66,
    SerId: 64,
    PageSize: 6
  })

  console.error(error.value, 'error ======>')
  if (!data.value) {
    return
  }
  list.value = data.value
}

onMounted(async () => {
  await nextTick()
  getApi()
})
</script>

<style lang="less" scoped>
</style>
