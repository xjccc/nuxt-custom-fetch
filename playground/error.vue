<template>
  <div>我是错误页面~</div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useError } from '#app'

onMounted(() => {
  const err = useError()
  const errValue = err.value as unknown as { url: string }
  console.log(errValue, 'error page')
})
</script>
