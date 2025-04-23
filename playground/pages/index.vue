<template>
  <div class="container">
    主页
    {{ list?.totalpage }}
    <br>
    <NuxtLink to="/example/reactive">
      Test reactive
    </NuxtLink>
    <br>
    <NuxtLink to="/example/duplicate">
      Test duplicate
    </NuxtLink>
    <br>
    <NuxtLink to="/example/handler">
      Test handler
    </NuxtLink>
    <br>
    <NuxtLink to="/example/v4-fetch">
      Test V4
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { ArticleInfo } from '../api/ajax'
import { nextTick, onMounted, ref } from 'vue'
import { getArticleListData } from '../api/ajax'
// const { data, error} = await getInfo<{ip: string}>({
//   sign: 123,
//   sign_time: 'aaa'
// })
// console.log(data.value, process.server)
const list = ref<Partial<ArticleInfo>>()
const getApi = async () => {
  const { data } = await getArticleListData({
    SubId: 66,
    SerId: 64,
    PageSize: 6
  })

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
