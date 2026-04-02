<template>
  <main class="catalog-page">
    <section class="hero">
      <p class="eyebrow">
        Nuxt Custom Fetch Playground
      </p>
      <h1>典型场景示例</h1>
      <p class="summary">
        这里把 playground 里的核心能力整理成几个真实场景，统一使用同一套示例名称，方便直接验证共享欢迎语、路由详情、分页列表、查询预处理、慢请求取消和基础状态控制。
      </p>
    </section>

    <section class="card-grid">
      <NuxtLink
        v-for="example in examples"
        :key="example.to"
        :to="example.to"
        class="example-card"
      >
        <p class="tag">
          {{ example.tag }}
        </p>
        <h2>{{ example.title }}</h2>
        <p class="description">
          {{ example.description }}
        </p>
        <span class="action">打开示例</span>
      </NuxtLink>
    </section>
  </main>
</template>

<script setup lang="ts">
const examples = [
  {
    to: '/example/v4-fetch',
    tag: 'Shared Greeting State',
    title: '页面与子组件共享同一份欢迎语数据',
    description: '演示 setup 内同 key 请求如何共享状态，以及 after mount 再次读取时的兼容表现。'
  },
  {
    to: '/example/v4-reactive-1',
    tag: 'Route-Driven Greeting',
    title: '欢迎语详情跟随路由参数自动切换',
    description: '用响应式 key 和路由参数驱动详情请求，适合用户详情、订单详情这类路由场景。'
  },
  {
    to: '/example/reactive',
    tag: 'Reactive Page List',
    title: '分页列表跟随 ref 自动刷新',
    description: '用 watch 和响应式 params 做加载更多列表，验证 page 变化会参与 key 计算。'
  },
  {
    to: '/example/handler',
    tag: 'Query Normalization',
    title: '统一预处理列表查询参数',
    description: '把原始输入规范化后再发请求，适合统一补充渠道参数、修正非法页码和清洗分页条件。'
  },
  {
    to: '/example/duplicate',
    tag: 'Slow Metric Dedupe',
    title: '慢统计请求只保留最后一次结果',
    description: '同 key 的慢请求只保留最后一次，模拟后台统计卡片或搜索建议这类高频交互场景。'
  },
  {
    to: '/example/test',
    tag: 'Manual Refresh & Clear',
    title: '手动 refresh 与 clear 控制欢迎语',
    description: '对比两个独立欢迎语请求的刷新与清空行为，适合作为最基础的 API 使用说明。'
  }
]
</script>

<style scoped>
.catalog-page {
  min-height: 100vh;
  padding: 48px 20px 64px;
  background:
    radial-gradient(circle at top left, rgba(24, 119, 242, 0.16), transparent 32%),
    radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.16), transparent 28%),
    linear-gradient(180deg, #f6fbff 0%, #f7f6f1 100%);
  color: #172033;
}

.hero {
  max-width: 860px;
  margin: 0 auto 32px;
}

.eyebrow {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0f766e;
}

h1 {
  margin: 0;
  font-size: clamp(32px, 5vw, 56px);
  line-height: 1.05;
}

.summary {
  max-width: 680px;
  margin: 18px 0 0;
  font-size: 17px;
  line-height: 1.7;
  color: #41506a;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
  max-width: 1080px;
  margin: 0 auto;
}

.example-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 220px;
  padding: 24px;
  border: 1px solid rgba(23, 32, 51, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 40px rgba(34, 46, 68, 0.08);
  text-decoration: none;
  color: inherit;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.example-card:hover {
  transform: translateY(-4px);
  border-color: rgba(15, 118, 110, 0.32);
  box-shadow: 0 22px 44px rgba(34, 46, 68, 0.12);
}

.tag {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f766e;
}

.example-card h2 {
  margin: 0;
  font-size: 24px;
  line-height: 1.25;
}

.description {
  margin: 0;
  line-height: 1.7;
  color: #516074;
}

.action {
  margin-top: auto;
  font-weight: 700;
  color: #175cd3;
}

@media (max-width: 640px) {
  .catalog-page {
    padding-top: 28px;
  }

  .example-card {
    min-height: unset;
  }
}
</style>
