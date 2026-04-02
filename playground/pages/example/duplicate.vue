<template>
  <main class="example-page">
    <NuxtLink class="back-link" to="/">
      返回示例目录
    </NuxtLink>

    <section class="hero">
      <p class="eyebrow">
        Slow Metric Dedupe
      </p>
      <h1>慢统计请求只保留最后一次结果</h1>
      <p class="summary">
        这里模拟后台统计卡片。接口会延迟 2 秒返回，当用户快速连点时，同 key 请求会共用一个状态容器，并由 dedupe cancel 取消旧请求。
      </p>
    </section>

    <section class="layout">
      <article class="panel">
        <h2>慢统计请求状态</h2>
        <dl class="meta">
          <div>
            <dt>目标页码</dt>
            <dd>{{ page }}</dd>
          </div>
          <div>
            <dt>status</dt>
            <dd>{{ status }}</dd>
          </div>
          <div>
            <dt>pending</dt>
            <dd>{{ pending ? 'true' : 'false' }}</dd>
          </div>
          <div>
            <dt>最终返回</dt>
            <dd>{{ data?.nums ?? '-' }}</dd>
          </div>
        </dl>
        <div class="actions">
          <button @click="runSingleRequest">
            请求当前页
          </button>
          <button class="secondary" @click="goNextPage">
            切到下一页
          </button>
          <button class="secondary" @click="runRapidRefresh">
            模拟快速双击
          </button>
        </div>
      </article>

      <article class="panel">
        <h2>请求日志</h2>
        <p class="caption">
          如果看到同一页触发了两次 start，但只有最后一个结果完成，就说明旧请求已经被取消或丢弃。
        </p>
        <ul class="log-list">
          <li v-for="entry in logs" :key="entry">
            {{ entry }}
          </li>
        </ul>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { CustomFetch } from '#imports'
import { ref, watch } from 'vue'

const page = ref(1)
const logs = ref<string[]>([])

const toRecord = (input: unknown) => {
  return input && typeof input === 'object' ? input as Record<string, unknown> : undefined
}

const pushLog = (message: string) => {
  logs.value = [`${new Date().toLocaleTimeString()} ${message}`, ...logs.value].slice(0, 8)
}

const ajax = new CustomFetch({
  baseURL: '/api',
  onRequest ({ options }) {
    pushLog(`start page=${String(toRecord(options.params)?.page ?? '-')}`)
  },
  onRequestError ({ error }) {
    pushLog(`request error ${error?.name || 'unknown'}`)
  },
  onResponse ({ response }) {
    pushLog(`done nums=${String(toRecord(response._data)?.nums ?? '-')}`)
  },
  onResponseError ({ response }) {
    pushLog(`response error status=${response.status}`)
  }
})

const { data, pending, refresh, status } = await ajax.get<{ nums: number }>('/get-num', {
  key: 'slow-metric-preview',
  params: {
    page
  }
}, {
  dedupe: 'cancel',
  immediate: false
})

watch(data, (value) => {
  if (!value) {
    return
  }

  pushLog(`ui committed page=${value.nums}`)
}, { immediate: true })

const runSingleRequest = async () => {
  pushLog(`manual refresh target=${page.value}`)
  await refresh()
}

const goNextPage = () => {
  page.value += 1
}

const runRapidRefresh = () => {
  page.value += 1
  pushLog(`rapid refresh target=${page.value}`)
  void refresh()
  void refresh()
}

await runSingleRequest()
</script>

<style scoped>
.example-page {
  min-height: 100vh;
  padding: 32px 20px 56px;
  background: linear-gradient(180deg, #fff7f7 0%, #f4f8ff 100%);
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
  color: #b42318;
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

.caption {
  margin: 10px 0 0;
  line-height: 1.7;
  color: #516074;
}

.log-list {
  display: grid;
  gap: 10px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
}

.log-list li {
  padding: 12px 14px;
  border-radius: 14px;
  background: #172033;
  color: #f8fbff;
}

@media (max-width: 860px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
