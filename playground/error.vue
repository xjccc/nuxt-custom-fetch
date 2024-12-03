<template>
  <div>我是错误页面~</div>
</template>

<script setup lang="ts">
import { useError } from '#app'
import { onMounted } from 'vue'

onMounted(() => {
  const err = useError()
  const errValue = err.value as unknown as { url: string }
  console.log(errValue, 'error page')
})
</script>
