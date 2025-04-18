<template>
  <div>
    <div v-for="item in list" :key="item">
      {{ item }}
    </div>
    <button @click="loadMore">
      点击加载
    </button>
    <button
      @click="refresh"
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
const { data, refresh, error, status } = await API.getListReactive(page)

watch(() => data.value, async () => {
  await nextTick()
  console.log(data.value)

  if (page.value === 1) {
    list.value = data.value?.data || []
  }
  else {
    list.value = list.value.concat(data.value?.data || [])
  }
}, {
  immediate: true
})
console.log(data.value, error.value, status.value, 'data =====>')

const getNum = async () => {
  const { data, refresh, error, status } = await API.getNum(page.value)

  if (data.value) {
    num.value = data.value.nums
    console.log(data.value, refresh, error.value, status.value, 'nums =====>')
  }
}

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
