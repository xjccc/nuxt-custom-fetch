<template>
  <div>
    <div v-for="item in list" :key="item">
      {{ item }}
    </div>
    <button @click="loadMore">
      点击加载
    </button>
  </div>
</template>
<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { CustomFetch } from '#imports'

const page1 = ref(2)

const ajax = new CustomFetch({
  baseURL: '/api',
  handler: (params) => {
    console.log(params, 'params =======>')
    return {
      ...params,
      look: 111
    }
  }
})

const page = ref(1)
const list = ref<number[]>([])
const getList = async () => {
  const { data } = await ajax.get<{data: number[]}>('/api/get-list', {
    params: {
      type: 'params'
    },
    useHandler: false,
    query: {
      page: page.value
    }
  })

  if (page.value === 1) {
    list.value = data.value?.data || []
  } else {
    list.value = list.value.concat(data.value?.data || [])
  }
  console.log(data.value, 'data =====>')
}

await getList()

onMounted(async () => {
  await nextTick()
  // fetch data at onMounted - nuxtApp.isHydrating = false?
})

const loadMore = () => {
  page.value++
  getList()
}
</script>
