<script setup lang="ts">
const cards = [
  { title: "订阅源", value: "4", meta: "3 个正常同步", status: "正常" },
  { title: "节点库", value: "128", meta: "116 个启用节点", status: "可用" },
  { title: "规则", value: "32", meta: "规则已排序", status: "已同步" },
  { title: "发布状态", value: "Live", meta: "订阅链接可用", status: "在线" },
];
</script>

<template>
  <section class="dashboard">
    <a-page-header class="page-title" title="首页" subtitle="当前 Mihomo 配置状态总览" />

    <section class="cards" aria-label="Dashboard status">
      <a-card v-for="card in cards" :key="card.title" class="status-card" :bordered="false">
        <div class="card-head">
          <span>{{ card.title }}</span>
          <a-tag color="arcoblue">{{ card.status }}</a-tag>
        </div>

        <strong>{{ card.value }}</strong>
        <p>{{ card.meta }}</p>
      </a-card>
    </section>
  </section>
</template>

<style scoped lang="less">
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.page-title {
  padding: 0;
  background: transparent;
}

.cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.status-card {
  min-height: 142px;
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
  background: var(--color-bg-1);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text-2);
  font-size: 14px;
}

.status-card strong {
  display: block;
  margin: 24px 0 10px;
  color: var(--color-text-1);
  font-size: 32px;
  line-height: 1;
  font-weight: 780;
  letter-spacing: 0;
}

.status-card p {
  color: var(--color-text-3);
  font-size: 13px;
}

@media (max-width: 1080px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
