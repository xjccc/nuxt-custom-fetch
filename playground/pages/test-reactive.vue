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
import { nextTick, onMounted, ref, watch } from 'vue'
import * as API from '../api'

const page = ref(1)
const list = ref<number[]>([])
const num = ref<number>()
let _refresh = () => {}
const getList = async () => {
  const { data, refresh, pending, error, status } = await API.getListReactive(page)
  watch(() => data.value, () => {
    if (page.value === 1) {
      list.value = data.value?.data || []
    }
    else {
      list.value = list.value.concat(data.value?.data || [])
    }
  })
  _refresh = refresh
  console.log(data.value, pending.value, error.value, status.value, 'data =====>')
}

const getNum = async () => {
  const { data, refresh, pending, error, status } = await API.getNum(page.value)

  if (data.value) {
    num.value = data.value.nums
    console.log(data.value, refresh, pending.value, error.value, status.value, 'nums =====>')
  }
}

await getList()
await getNum()

onMounted(async () => {
  await nextTick()
  // fetch data at onMounted - nuxtApp.isHydrating = false?
})

const loadMore = () => {
  page.value++
  console.log(page.value, 'page.value -------')
}
</script>
