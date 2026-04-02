<template>
  <main class="example-page">
    <NuxtLink class="back-link" to="/">
      返回示例目录
    </NuxtLink>

    <section class="hero">
      <p class="eyebrow">
        Shared Greeting State
      </p>
      <h1>页面和子组件共享同一份欢迎语数据</h1>
      <p class="summary">
        页面在 setup 中先读取一次欢迎语，子组件再用相同请求读取同一个 key，对共享状态做 refresh 或乐观更新时，两边会同步变化。
      </p>
    </section>

    <section class="grid">
      <article class="panel">
        <p class="label">
          页面视角
        </p>
        <h2>当前共享欢迎语</h2>
        <p class="value">
          {{ data || '暂无结果' }}
        </p>
        <dl class="meta">
          <div>
            <dt>状态</dt>
            <dd>{{ status }}</dd>
          </div>
          <div>
            <dt>after mount 再次读取</dt>
            <dd>{{ mountedMessage || '等待客户端再次读取' }}</dd>
          </div>
        </dl>
        <div class="actions">
          <button @click="refreshSharedData">
            刷新欢迎语
          </button>
        </div>
      </article>

      <Test />
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getGreeting } from '@/api'

const { data, refresh, status } = await getGreeting({
  userId: 7,
  name: 'dashboard'
})

const mountedMessage = ref('')

const refreshSharedData = async () => {
  await refresh()
}

onMounted(async () => {
  const { data: mountedData } = await getGreeting({
    userId: 7,
    name: 'dashboard'
  })

  mountedMessage.value = mountedData.value || ''
})
</script>

<style scoped>
.example-page {
  min-height: 100vh;
  padding: 32px 20px 56px;
  background: linear-gradient(180deg, #fbfcff 0%, #eef6ff 100%);
  color: #172033;
}

.back-link {
  display: inline-flex;
  margin: 0 auto 24px;
  color: #175cd3;
  font-weight: 700;
  text-decoration: none;
}

.hero,
.grid {
  max-width: 1080px;
  margin: 0 auto;
}

.eyebrow,
.label {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f766e;
}

.hero h1,
.panel h2 {
  margin: 0;
}

.hero h1 {
  font-size: clamp(30px, 4vw, 48px);
}

.summary {
  max-width: 720px;
  margin: 16px 0 0;
  line-height: 1.7;
  color: #516074;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
  margin-top: 28px;
}

.panel {
  padding: 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 40px rgba(34, 46, 68, 0.08);
}

.value {
  margin: 18px 0;
  font-size: 24px;
  font-weight: 700;
}

.meta {
  display: grid;
  gap: 12px;
  margin: 0;
}

.meta div {
  padding: 12px 14px;
  border-radius: 16px;
  background: #f4f7fb;
}

.meta dt {
  font-size: 12px;
  font-weight: 700;
  color: #627287;
}

.meta dd {
  margin: 6px 0 0;
  font-size: 16px;
}

.actions {
  margin-top: 18px;
}

button {
  padding: 10px 14px;
  border: none;
  border-radius: 999px;
  background: #172033;
  color: #fff;
  font: inherit;
  cursor: pointer;
}
</style>
