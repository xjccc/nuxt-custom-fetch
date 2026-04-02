<template>
  <main class="example-page">
    <NuxtLink class="back-link" to="/">
      返回示例目录
    </NuxtLink>

    <section class="hero">
      <p class="eyebrow">
        Query Normalization
      </p>
      <h1>统一预处理列表查询参数</h1>
      <p class="summary">
        这个页面模拟后台列表查询。用户的原始输入会先经过 handler 清洗，再进入最终请求，适合统一补充渠道参数、修正非法页码、清理空值。
      </p>
    </section>

    <section class="layout">
      <article class="panel">
        <h2>原始输入</h2>
        <label>
          页码输入
          <input v-model="rawPage" type="text">
        </label>
        <label class="toggle">
          <input v-model="useHandler" type="checkbox">
          启用 handler 预处理
        </label>
        <div class="actions">
          <button @click="search">
            立即查询
          </button>
          <button class="secondary" @click="applyInvalidCase">
            试试非法页码 0
          </button>
          <button class="secondary" @click="loadNextPage">
            加载下一页
          </button>
        </div>
        <dl class="meta">
          <div>
            <dt>最后一次模式</dt>
            <dd>{{ useHandler ? 'handler 已启用' : 'handler 已关闭' }}</dd>
          </div>
          <div>
            <dt>请求状态</dt>
            <dd>{{ requestStatus }}</dd>
          </div>
        </dl>
      </article>

      <article class="panel">
        <h2>最终查询参数</h2>
        <pre>{{ handledPreview }}</pre>
        <h2 class="second-title">
          返回结果
        </h2>
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
import { CustomFetch } from '#imports'
import { computed, ref } from 'vue'

const rawPage = ref('1')
const useHandler = ref(true)
const list = ref<number[]>([])
const requestStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const handledQuery = ref<Record<string, unknown>>({
  page: 1,
  scene: 'inventory',
  source: 'playground-demo'
})

const ajax = new CustomFetch({
  baseURL: '/api',
  handler: (params) => {
    const rawValue = Number(params.page ?? 1)
    const page = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 1
    const nextQuery = {
      ...params,
      page,
      source: 'playground-demo'
    }

    handledQuery.value = nextQuery
    return nextQuery
  }
})

const handledPreview = computed(() => JSON.stringify(handledQuery.value, null, 2))

const search = async () => {
  requestStatus.value = 'pending'

  const payload = {
    page: rawPage.value,
    scene: 'inventory'
  }

  if (!useHandler.value) {
    handledQuery.value = payload
  }

  const { data, status } = await ajax.get<{
    data: number[]
    nums: number
  }>('/get-list', {
    params: {
      scene: 'inventory'
    },
    query: {
      page: rawPage.value
    },
    useHandler: useHandler.value
  })

  requestStatus.value = status.value
  list.value = data.value?.data || []
}

const applyInvalidCase = async () => {
  rawPage.value = '0'
  await search()
}

const loadNextPage = async () => {
  const nextValue = Math.max(1, Number(rawPage.value || 1)) + 1
  rawPage.value = String(nextValue)
  await search()
}

await search()
</script>

<style scoped>
.example-page {
  min-height: 100vh;
  padding: 32px 20px 56px;
  background: linear-gradient(180deg, #fffaf4 0%, #f0f7ff 100%);
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

.panel h2 {
  margin: 0;
}

label {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  font-weight: 700;
}

.toggle {
  grid-template-columns: auto 1fr;
  align-items: center;
}

input[type='text'] {
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

pre {
  margin: 16px 0 0;
  padding: 16px;
  border-radius: 16px;
  background: #172033;
  color: #f8fbff;
  overflow: auto;
}

.second-title {
  margin-top: 22px;
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

@media (max-width: 860px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
