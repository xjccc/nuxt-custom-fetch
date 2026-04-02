<template>
  <main class="example-page">
    <NuxtLink class="back-link" to="/">
      返回示例目录
    </NuxtLink>

    <section class="hero">
      <p class="eyebrow">
        Reactive Page List
      </p>
      <h1>分页列表跟随 ref 自动刷新</h1>
      <p class="summary">
        这里把页码放进响应式 params，并通过 watch 自动刷新分页数字列表。这个场景适合商品列表、消息列表、订单分页等典型页面。
      </p>
    </section>

    <section class="layout">
      <article class="panel controls">
        <h2>查询控制</h2>
        <label>
          当前页码
          <input v-model.number="page" min="1" type="number">
        </label>
        <div class="actions">
          <button @click="loadMore">
            加载下一页
          </button>
          <button class="secondary" @click="resetToFirstPage">
            回到第一页
          </button>
          <button class="secondary" @click="reloadCurrentPage">
            手动刷新当前页
          </button>
        </div>
        <dl class="meta">
          <div>
            <dt>status</dt>
            <dd>{{ status }}</dd>
          </div>
          <div>
            <dt>pending</dt>
            <dd>{{ pending ? 'true' : 'false' }}</dd>
          </div>
          <div>
            <dt>最后返回页码</dt>
            <dd>{{ data?.nums ?? '-' }}</dd>
          </div>
        </dl>
        <p v-if="error" class="error-text">
          {{ error.message }}
        </p>
      </article>

      <article class="panel">
        <h2>已加载列表</h2>
        <p class="caption">
          当前累计 {{ list.length }} 条，页码变化后 key 会随着 params 一起变化。
        </p>
        <div class="number-grid">
          <span v-for="item in list" :key="item" class="number-chip">
            {{ item }}
          </span>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getReactivePageList } from '@/api'

const page = ref(1)
const list = ref<number[]>([])
const { data, error, pending, refresh, status } = await getReactivePageList(page)

watch(data, (value) => {
  if (!value) {
    return
  }

  if (page.value === 1) {
    list.value = value.data
    return
  }

  const nextItems = value.data.filter(item => !list.value.includes(item))
  list.value = [...list.value, ...nextItems]
}, { immediate: true })

const loadMore = () => {
  page.value += 1
}

const resetToFirstPage = async () => {
  list.value = []

  if (page.value === 1) {
    await refresh()
    return
  }

  page.value = 1
}

const reloadCurrentPage = async () => {
  await refresh()
}
</script>

<style scoped>
.example-page {
  min-height: 100vh;
  padding: 32px 20px 56px;
  background: linear-gradient(180deg, #fffef8 0%, #eef8f2 100%);
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
  max-width: 1080px;
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
  display: grid;
  grid-template-columns: minmax(280px, 340px) 1fr;
  gap: 18px;
  margin-top: 28px;
}

.panel {
  padding: 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 40px rgba(34, 46, 68, 0.08);
}

.controls label {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  font-weight: 700;
}

input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d6deea;
  border-radius: 14px;
  background: #f8fbff;
  font: inherit;
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

.meta {
  display: grid;
  gap: 12px;
  margin: 20px 0 0;
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

.caption {
  margin: 10px 0 0;
  color: #516074;
}

.number-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.number-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  border-radius: 18px;
  background: #f4f7fb;
  font-weight: 700;
}

.error-text {
  margin-top: 16px;
  color: #b42318;
}

@media (max-width: 860px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
