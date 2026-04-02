<template>
  <article class="panel">
    <p class="label">
      子组件视角
    </p>
    <h2>读取同 key 的共享欢迎语</h2>
    <p class="value">
      {{ data || '暂无结果' }}
    </p>
    <p class="note">
      这里使用和页面相同的请求参数，所以读到的是同一个 async-data bucket。
    </p>
    <div class="actions">
      <button @click="applyOptimisticPatch">
        模拟子组件乐观更新
      </button>
      <button class="secondary" @click="syncFromServer">
        从服务端恢复
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { getGreeting } from '@/api'

const { data, refresh } = await getGreeting({
  userId: 7,
  name: 'dashboard'
})

const applyOptimisticPatch = () => {
  if (!data.value) {
    return
  }

  data.value = 'hello world 7 · updated in child'
}

const syncFromServer = async () => {
  await refresh()
}
</script>

<style scoped>
.panel {
  padding: 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 40px rgba(34, 46, 68, 0.08);
}

.label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f766e;
}

h2 {
  margin: 0;
  font-size: 24px;
}

.value {
  margin: 18px 0 10px;
  font-size: 24px;
  font-weight: 700;
  color: #172033;
}

.note {
  margin: 0;
  line-height: 1.7;
  color: #516074;
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
