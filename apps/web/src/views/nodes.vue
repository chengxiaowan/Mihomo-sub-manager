<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Message, Modal } from "@arco-design/web-vue";
import { nodeApi, type ProxyNode } from "@/api/nodes";
import { nodeTypeColor } from "@/utils/badges";

const items = ref<ProxyNode[]>([]);
const total = ref(0);
const loading = ref(false);
const filters = ref({ keyword: "", type: "", page: 1, pageSize: 30 });

const TYPE_OPTIONS = ["vmess", "vless", "trojan", "ss", "ssr", "http"];

function typeStyle(type: string) {
  const color = nodeTypeColor(type);
  return { color, bg: `${color}1a` }; // 同色 10% 透明底
}


async function load() {
  loading.value = true;
  try {
    const res = await nodeApi.list({
      keyword: filters.value.keyword || undefined,
      type: filters.value.type || undefined,
      page: filters.value.page,
      pageSize: filters.value.pageSize,
    });
    items.value = res.items;
    total.value = res.total;
  } finally { loading.value = false; }
}

async function toggleEnabled(node: ProxyNode) {
  await nodeApi.update(node.id, { enabled: !node.enabled });
  node.enabled = !node.enabled;
}

function confirmDelete(node: ProxyNode) {
  Modal.confirm({
    title: `删除节点「${node.name}」？`, content: "",
    okText: "确认删除",
    okButtonProps: { status: "danger" },
    onOk: async () => { await nodeApi.remove(node.id); Message.success("已删除"); await load(); },
  });
}

function onSearch() { filters.value.page = 1; load(); }

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h2 class="page-title">节点库</h2>
        <p class="page-desc">共 {{ total }} 个节点</p>
      </div>
      <div class="filters">
        <a-input-search
          v-model="filters.keyword"
          placeholder="搜索节点或服务器"
          style="width:220px"
          allow-clear
          @search="onSearch"
          @clear="onSearch"
        />
        <a-select v-model="filters.type" placeholder="协议" style="width:120px" allow-clear @change="onSearch">
          <a-option v-for="t in TYPE_OPTIONS" :key="t" :value="t">{{ t }}</a-option>
        </a-select>
      </div>
    </div>

    <a-spin :loading="loading" style="display:block;width:100%">
      <div class="node-grid">
        <div v-for="node in items" :key="node.id" class="node-card" :class="{ disabled: !node.enabled }">
          <div class="node-card-top">
            <span
              class="type-badge"
              :style="{ color: typeStyle(node.type).color, background: typeStyle(node.type).bg }"
            >{{ node.type }}</span>
            <div class="node-card-controls">
              <a-switch :model-value="node.enabled" size="small" @change="toggleEnabled(node)" />
              <a-button size="mini" status="danger" @click="confirmDelete(node)">
                <template #icon><icon-delete /></template>
              </a-button>
            </div>
          </div>
          <div class="node-name" :title="node.name">{{ node.name }}</div>
          <div class="node-server">{{ node.server }}:{{ node.port }}</div>
          <div v-if="node.source" class="node-source">{{ node.source.name }}</div>
        </div>
        <div v-if="!loading && items.length === 0" class="empty-tip">
          <icon-robot style="font-size:36px;color:#bbb;margin-bottom:10px" />
          <p>暂无节点，请先拉取订阅</p>
        </div>
      </div>
    </a-spin>

    <div v-if="total > filters.pageSize" class="pagination">
      <a-pagination
        :total="total"
        :current="filters.page"
        :page-size="filters.pageSize"
        @change="(p: number) => { filters.page = p; load(); }"
      />
    </div>
  </div>
</template>

<style scoped lang="less">
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}
.page-title { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
.page-desc { margin: 0; font-size: 13px; color: var(--color-text-3); }
.filters { display: flex; gap: 10px; }

.node-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.node-card {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: box-shadow 0.2s, transform 0.15s;
  &:hover { box-shadow: 0 3px 14px rgba(0,0,0,.08); transform: translateY(-1px); }
  &.disabled { opacity: 0.5; }
}

.node-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.node-card-controls { display: flex; align-items: center; gap: 6px; }

.type-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}

.node-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-server { font-size: 12px; color: var(--color-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.node-source { font-size: 11px; color: var(--color-text-3); }

.empty-tip {
  grid-column: 1/-1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px;
  color: var(--color-text-3);
  font-size: 14px;
}

.pagination { display: flex; justify-content: center; margin-top: 24px; }

body:not([arco-theme="dark"]) .node-card { background: #fafafa; }
</style>
