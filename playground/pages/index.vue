<template>
  <div class="container">
    主页
    {{ list?.totalpage }}
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { type ArticleInfo, getArticleListData } from '../api/ajax'
// const { data, error, pending } = await getInfo<{ip: string}>({
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
  console.log(data.value)

  if (!data.value) { return }
  list.value = data.value
}

onMounted(async () => {
  await nextTick()
  getApi()
})
</script>
<style lang="less" scoped>
</style>
