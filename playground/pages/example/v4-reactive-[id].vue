<template>
  <main class="example-page">
    <NuxtLink class="back-link" to="/">
      返回示例目录
    </NuxtLink>

    <section class="hero">
      <p class="eyebrow">
        Route-Driven Greeting
      </p>
      <h1>欢迎语详情跟随路由参数自动切换</h1>
      <p class="summary">
        这个页面模拟用户详情欢迎语。路由上的 id 和请求 key 都是响应式的，切换路由时会自动请求新的用户结果，不需要自己手动重建请求。
      </p>
    </section>

    <section class="layout">
      <article class="panel">
        <h2>当前欢迎语详情</h2>
        <dl class="meta">
          <div>
            <dt>路由 id</dt>
            <dd>{{ userId }}</dd>
          </div>
          <div>
            <dt>async key</dt>
            <dd>{{ requestKey }}</dd>
          </div>
          <div>
            <dt>返回欢迎语</dt>
            <dd>{{ user || '暂无结果' }}</dd>
          </div>
          <div>
            <dt>status</dt>
            <dd>{{ status }}</dd>
          </div>
        </dl>
        <div class="actions">
          <button @click="previousUser">
            上一个用户
          </button>
          <button class="secondary" @click="nextUser">
            下一个用户
          </button>
          <button class="secondary" @click="randomUser">
            随机跳转
          </button>
          <button class="secondary" @click="refreshUser">
            手动刷新
          </button>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from '#imports'
import { computed } from 'vue'
import { getGreetingByUserId } from '@/api'

const route = useRoute()
const router = useRouter()

const userId = computed(() => {
  const routeId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  const parsed = Number(routeId ?? 1)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
})

const requestKey = computed(() => `user-${userId.value}`)

const { data: user, refresh, status } = await getGreetingByUserId(requestKey, {
  userId
})

const goToUser = async (id: number) => {
  await router.push({
    path: `/example/v4-reactive-${id}`
  })
}

const previousUser = async () => {
  await goToUser(Math.max(1, userId.value - 1))
}

const nextUser = async () => {
  await goToUser(userId.value + 1)
}

const randomUser = async () => {
  await goToUser(Math.floor(Math.random() * 100) + 1)
}

const refreshUser = async () => {
  await refresh()
}
</script>

<style scoped>
.example-page {
  min-height: 100vh;
  padding: 32px 20px 56px;
  background: linear-gradient(180deg, #f9fbff 0%, #f4fdf9 100%);
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
.layout {
  max-width: 960px;
  margin: 0 auto;
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f766e;
}

.hero h1 {
  margin: 0;
  font-size: clamp(30px, 4vw, 48px);
}

.summary {
  max-width: 720px;
  margin: 16px 0 0;
  line-height: 1.7;
  color: #516074;
}

.layout {
  margin-top: 28px;
}

.panel {
  padding: 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 40px rgba(34, 46, 68, 0.08);
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
</style>
