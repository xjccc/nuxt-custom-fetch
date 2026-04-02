<template>
  <main class="example-page">
    <NuxtLink class="back-link" to="/">
      返回示例目录
    </NuxtLink>

    <section class="hero">
      <p class="eyebrow">
        Manual Refresh & Clear
      </p>
      <h1>最基础的 refresh 和 clear 控制欢迎语</h1>
      <p class="summary">
        这个页面保留最简单的使用方式，用两条不同参数的欢迎语请求演示 refresh、clear 以及独立 key 之间互不影响。
      </p>
    </section>

    <section class="grid">
      <article class="panel">
        <p class="label">
          用户 1 欢迎语
        </p>
        <h2>{{ primaryData || '暂无结果' }}</h2>
        <div class="actions">
          <button @click="refreshPrimary">
            刷新用户 1 欢迎语
          </button>
          <button class="secondary" @click="clearPrimary">
            清空用户 1 欢迎语
          </button>
        </div>
      </article>

      <article class="panel">
        <p class="label">
          用户 2 欢迎语
        </p>
        <h2>{{ secondaryData || '暂无结果' }}</h2>
        <p class="note">
          它使用另一组参数，所以和左侧是独立的请求状态。
        </p>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { getGreeting } from '@/api'

const {
  clear,
  data: primaryData,
  refresh
} = await getGreeting({
  userId: 1,
  name: 'manual-control'
})

const { data: secondaryData } = await getGreeting({
  userId: 2,
  name: 'manual-control'
})

const refreshPrimary = async () => {
  await refresh()
}

const clearPrimary = () => {
  clear()
}
</script>

<style scoped>
.example-page {
  min-height: 100vh;
  padding: 32px 20px 56px;
  background: linear-gradient(180deg, #faf7ff 0%, #f5faf9 100%);
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
  max-width: 960px;
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

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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

.secondary {
  background: #e9eef7;
  color: #172033;
}

.note {
  margin-top: 16px;
  line-height: 1.7;
  color: #516074;
}
</style>
