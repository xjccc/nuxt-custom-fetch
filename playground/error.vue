<template>
  <div>我是错误页面~</div>
</template>

<script setup lang="ts">
onMounted(() => {
  const err = useError()
  const errValue = err.value as { url: string }
  console.log(errValue, 'error page')
})
</script>
