<template>
  <div
    class="container"
  >
    {{ user }}
    <button @click="jump">
      Click
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from '#imports'
import { exampleApi2 } from '@/api'
import { computed, ref } from 'vue'

const route = useRoute()
const router = useRouter()
const userId = ref(route.params.id)
const { data: user } = await exampleApi2(computed(() => `user-${userId.value}`), {
  userId
})
console.log(user.value)
const jump = () => {
  const id = Math.floor(Math.random() * 100)
  router.push({
    path: `/example/v4-reactive-${id}`
  })
}
// Changing the userId will automatically trigger a new data fetch
// and clean up the old data if no other components are using it
// userId.value = '456'
</script>

<style lang="less" scoped>

</style>
