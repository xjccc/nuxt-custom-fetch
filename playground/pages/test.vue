<template>
  <div>
    <div v-for="item in list" :key="item">
      {{ item }}
    </div>
    <button @click="loadMore">
      点击加载
    </button>
    <button
      @click="async () => {
        _refresh()
        console.log('重置')
      }"
    >
      重置
    </button>
  </div>
</template>
<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import * as API from '../api'
import { useAsyncData, useFetch } from '#imports'
const page = ref(1)
const list = ref<number[]>([])
let _refresh = () => {}
const getList = async () => {
  const { data, refresh, pending, error, status } = await API.getList(page.value)
  // const { data, refresh } = await useFetch('/api/get-list', {
  //   params: {
  //     page: page.value
  //   }
  // })
  if (page.value === 1) {
    list.value = data.value?.data || []
  } else {
    list.value = list.value.concat(data.value?.data || [])
  }
  _refresh = refresh
  console.log(data.value, pending.value, error.value, status.value, 'data =====>')
}

await getList()

onMounted(async () => {
  await nextTick()
  // fetch data at onMounted - nuxtApp.isHydrating = false?
})

const loadMore = () => {
  // if (page.value === 2) {
  //   page.value = 2
  // } else {
  page.value++
  // }
  console.log(page.value, 'page.value -------')
  // _refresh()
  getList()
  getList()
  // await nextTick
}
</script>
