<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Message, Modal } from "@arco-design/web-vue";
import { groupApi, type ProxyGroup, type ProxyGroupInput } from "@/api/groups";
import { nodeApi, type ProxyNode } from "@/api/nodes";
import { nodeTypeColor } from "@/utils/badges";

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  "select":       { label: "手动选择", color: "#1677ff", bg: "#e6f4ff" },
  "url-test":     { label: "自动测速", color: "#00b96b", bg: "#e6fff5" },
  "fallback":     { label: "故障转移", color: "#fa8c16", bg: "#fff7e6" },
  "load-balance": { label: "负载均衡", color: "#722ed1", bg: "#f9f0ff" },
};
function typeConf(type: string) {
  return TYPE_CONFIG[type] ?? { label: type, color: "#595959", bg: "#f5f5f5" };
}

// ── 列表（左栏） ──────────────────────────────────────────────
const list = ref<ProxyGroup[]>([]);
const loading = ref(false);
const search = ref("");
const selectedId = ref<string | null>(null);

const filteredList = computed(() => {
  const kw = search.value.trim().toLowerCase();
  return kw ? list.value.filter((g) => g.name.toLowerCase().includes(kw)) : list.value;
});

// ── 详情（右栏） ──────────────────────────────────────────────
const detail = ref<ProxyGroup | null>(null);
const detailLoading = ref(false);
const activeTab = ref("overview");

type OverviewForm = {
  name: string;
  type: string;
  url: string;
  interval?: number;
  tolerance?: number;
  lazy: boolean;
  filter: string;
};
const overviewForm = ref<OverviewForm>({
  name: "",
  type: "select",
  url: "",
  interval: undefined,
  tolerance: undefined,
  lazy: false,
  filter: "",
});
const overviewSaving = ref(false);
const isTestingType = computed(() =>
  ["url-test", "fallback", "load-balance"].includes(overviewForm.value.type)
);

// 成员节点
const allNodes = ref<ProxyNode[]>([]);
const selectedNodeIds = ref<string[]>([]);
const nodeKeyword = ref("");
const nodeSaving = ref(false);

const kw = computed(() => nodeKeyword.value.trim().toLowerCase());
const filteredNodes = computed(() =>
  allNodes.value.filter((n) => !kw.value || n.name.toLowerCase().includes(kw.value))
);
const selectedNodeList = computed(() =>
  selectedNodeIds.value
    .map((id) => allNodes.value.find((n) => n.id === id))
    .filter((n): n is ProxyNode => !!n)
);
function toggleNode(id: string) {
  selectedNodeIds.value.includes(id)
    ? (selectedNodeIds.value = selectedNodeIds.value.filter((v) => v !== id))
    : selectedNodeIds.value.push(id);
}
function removeNode(id: string) {
  selectedNodeIds.value = selectedNodeIds.value.filter((v) => v !== id);
}

// ── 新建代理组抽屉 ────────────────────────────────────────────
const createVisible = ref(false);
const createForm = ref({ name: "", type: "select", enabled: true });
const creating = ref(false);

function patchListItem(id: string, patch: Partial<ProxyGroup>) {
  const t = list.value.find((g) => g.id === id);
  if (t) Object.assign(t, patch);
}

async function load() {
  loading.value = true;
  try {
    list.value = await groupApi.list();
    if (!allNodes.value.length) {
      const page = await nodeApi.list({ pageSize: 9999 });
      allNodes.value = page.items;
    }
    if (list.value.length) {
      const stillExists = list.value.some((g) => g.id === selectedId.value);
      await selectGroup(stillExists ? selectedId.value! : list.value[0].id);
    } else {
      selectedId.value = null;
      detail.value = null;
    }
  } finally {
    loading.value = false;
  }
}

async function selectGroup(id: string) {
  selectedId.value = id;
  detailLoading.value = true;
  try {
    const d = await groupApi.get(id);
    detail.value = d;
    overviewForm.value = {
      name: d.name,
      type: d.type,
      url: d.url ?? "",
      interval: d.interval ?? undefined,
      tolerance: d.tolerance ?? undefined,
      lazy: d.lazy ?? false,
      filter: d.filter ?? "",
    };
    selectedNodeIds.value = (d.nodes ?? []).map((n) => n.id);
  } finally {
    detailLoading.value = false;
  }
}

async function saveOverview() {
  if (!detail.value) return;
  if (!overviewForm.value.name.trim()) {
    Message.warning("请填写代理组名称");
    return;
  }
  overviewSaving.value = true;
  try {
    const f = overviewForm.value;
    const payload: ProxyGroupInput = {
      name: f.name,
      type: f.type,
      url: f.url,
      filter: f.filter,
    };
    if (isTestingType.value) {
      if (f.interval != null) payload.interval = f.interval;
      payload.lazy = f.lazy;
    }
    if (f.type === "url-test" && f.tolerance != null) payload.tolerance = f.tolerance;
    const updated = await groupApi.update(detail.value.id, payload);
    detail.value = { ...detail.value, ...updated };
    patchListItem(detail.value.id, { name: updated.name, type: updated.type });
    Message.success("已保存");
  } finally {
    overviewSaving.value = false;
  }
}

async function toggleEnable() {
  if (!detail.value) return;
  const next = !detail.value.enabled;
  await groupApi.update(detail.value.id, { enabled: next });
  detail.value.enabled = next;
  patchListItem(detail.value.id, { enabled: next });
}

async function saveNodes() {
  if (!detail.value) return;
  nodeSaving.value = true;
  try {
    await groupApi.setNodes(detail.value.id, selectedNodeIds.value);
    patchListItem(detail.value.id, { _count: { nodes: selectedNodeIds.value.length } });
    Message.success("成员节点已保存");
  } finally {
    nodeSaving.value = false;
  }
}

function confirmDelete() {
  if (!detail.value) return;
  const g = detail.value;
  Modal.confirm({
    title: `删除代理组「${g.name}」？`,
    content: "",
    okText: "确认删除",
    okButtonProps: { status: "danger" },
    onOk: async () => {
      await groupApi.remove(g.id);
      Message.success("已删除");
      await load();
    },
  });
}

function openCreate() {
  createForm.value = { name: "", type: "select", enabled: true };
  createVisible.value = true;
}
async function submitCreate() {
  if (!createForm.value.name.trim()) {
    Message.warning("请填写代理组名称");
    return;
  }
  creating.value = true;
  try {
    const created = await groupApi.create(createForm.value);
    createVisible.value = false;
    Message.success("已创建");
    list.value = await groupApi.list();
    await selectGroup(created.id);
    activeTab.value = "overview";
  } finally {
    creating.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="md-shell">
    <!-- 左栏 -->
    <aside class="md-aside">
      <a-input v-model="search" placeholder="搜索代理组..." allow-clear class="aside-search">
        <template #prefix><icon-search /></template>
      </a-input>
      <a-spin :loading="loading" style="display:block;flex:1;min-height:0">
        <div class="md-list">
          <div
            v-for="g in filteredList" :key="g.id"
            class="md-item" :class="{ active: g.id === selectedId }"
            @click="selectGroup(g.id)"
          >
            <span class="pi-dot" :style="{ background: typeConf(g.type).color }" />
            <div class="pi-main">
              <span class="pi-name">{{ g.name }}</span>
              <span class="pi-sub">{{ typeConf(g.type).label }} · {{ g._count?.nodes ?? 0 }} 节点</span>
            </div>
          </div>
          <div v-if="!loading && filteredList.length === 0" class="aside-empty">
            {{ search ? "无匹配代理组" : "还没有代理组" }}
          </div>
        </div>
      </a-spin>
      <a-button long type="outline" class="aside-create" @click="openCreate">
        <template #icon><icon-plus /></template>新建代理组
      </a-button>
    </aside>

    <!-- 右栏 -->
    <section class="md-detail">
      <div v-if="!detail" class="detail-empty">
        <icon-layers style="font-size:40px;color:#ccc;margin-bottom:12px" />
        <p>{{ loading ? "加载中..." : "选择或新建一个代理组" }}</p>
      </div>

      <a-spin v-else :loading="detailLoading" style="display:block;width:100%">
        <div class="detail-header">
          <div class="dh-left">
            <h2 class="dh-name">{{ detail.name }}</h2>
            <p class="dh-summary">
              <span class="type-chip" :style="{ color: typeConf(detail.type).color, background: typeConf(detail.type).bg }">
                {{ typeConf(detail.type).label }}
              </span>
              {{ selectedNodeIds.length }} 个成员节点
            </p>
          </div>
          <div class="dh-right">
            <a-switch :model-value="detail.enabled" @change="toggleEnable">
              <template #checked>启用</template>
              <template #unchecked>禁用</template>
            </a-switch>
            <a-button status="danger" @click="confirmDelete">
              <template #icon><icon-delete /></template>删除
            </a-button>
          </div>
        </div>

        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <!-- 概览 -->
          <a-tab-pane key="overview" title="概览">
            <a-form :model="overviewForm" layout="vertical" class="tab-form">
              <a-form-item label="代理组名称">
                <a-input v-model="overviewForm.name" placeholder="手动选择" />
              </a-form-item>
              <a-form-item label="类型">
                <a-select v-model="overviewForm.type">
                  <a-option v-for="(conf, key) in TYPE_CONFIG" :key="key" :value="key">{{ conf.label }}</a-option>
                </a-select>
              </a-form-item>

              <a-divider orientation="left" style="font-size:13px">高级设置</a-divider>
              <a-row :gutter="16">
                <a-col v-if="isTestingType" :span="12">
                  <a-form-item label="测速地址 (url)">
                    <a-input v-model="overviewForm.url" placeholder="http://www.gstatic.com/generate_204" allow-clear />
                  </a-form-item>
                </a-col>
                <a-col v-if="isTestingType" :span="12">
                  <a-form-item label="测速间隔 (interval，秒)">
                    <a-input-number v-model="overviewForm.interval" :min="1" placeholder="300" style="width:100%" />
                  </a-form-item>
                </a-col>
                <a-col v-if="overviewForm.type === 'url-test'" :span="12">
                  <a-form-item label="容差 (tolerance，毫秒)">
                    <a-input-number v-model="overviewForm.tolerance" :min="0" placeholder="不设置" style="width:100%" />
                  </a-form-item>
                </a-col>
                <a-col v-if="isTestingType" :span="12">
                  <a-form-item label="惰性测速 (lazy)">
                    <a-switch v-model="overviewForm.lazy" />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="代理过滤 (filter，正则)">
                <a-input v-model="overviewForm.filter" placeholder="如 (?i)香港|HK，留空不过滤" allow-clear />
              </a-form-item>

              <a-button type="primary" :loading="overviewSaving" @click="saveOverview">保存</a-button>
            </a-form>
          </a-tab-pane>

          <!-- 成员节点 -->
          <a-tab-pane key="nodes" title="成员节点">
            <div class="tab-toolbar">
              <span class="tab-hint">已选 {{ selectedNodeIds.length }} / {{ allNodes.length }} 个节点</span>
              <a-button type="primary" size="small" :loading="nodeSaving" @click="saveNodes">保存</a-button>
            </div>
            <a-input v-model="nodeKeyword" placeholder="搜索节点..." allow-clear style="max-width:560px;margin-bottom:14px">
              <template #prefix><icon-search /></template>
            </a-input>

            <div class="dual-cols">
              <div class="dual-col">
                <div class="section-header">
                  <span class="section-title">可选节点</span>
                  <span class="section-count">{{ filteredNodes.length }} 个</span>
                </div>
                <div class="node-section">
                  <div v-if="filteredNodes.length === 0" class="section-empty">
                    {{ nodeKeyword ? "无匹配结果" : "暂无节点" }}
                  </div>
                  <label
                    v-for="node in filteredNodes" :key="node.id"
                    class="node-row" :class="{ active: selectedNodeIds.includes(node.id) }"
                  >
                    <a-checkbox :model-value="selectedNodeIds.includes(node.id)" @change="toggleNode(node.id)" />
                    <span class="node-row-name">{{ node.name }}</span>
                    <span class="node-type-badge" :style="{ color: nodeTypeColor(node.type), background: `${nodeTypeColor(node.type)}1a` }">
                      {{ node.type }}
                    </span>
                  </label>
                </div>
              </div>

              <div class="dual-col">
                <div class="section-header">
                  <span class="section-title">已选节点 ({{ selectedNodeIds.length }})</span>
                </div>
                <div class="node-section">
                  <div v-if="selectedNodeList.length === 0" class="section-empty">暂未选择任何节点</div>
                  <div v-for="node in selectedNodeList" :key="node.id" class="node-row">
                    <span class="node-dot" :style="{ background: nodeTypeColor(node.type) }" />
                    <span class="node-row-name">{{ node.name }}</span>
                    <a-button size="mini" type="text" status="danger" @click="removeNode(node.id)">
                      <template #icon><icon-close /></template>
                    </a-button>
                  </div>
                </div>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-spin>
    </section>

    <!-- 新建代理组抽屉 -->
    <a-modal
      v-model:visible="createVisible"
      title="新建代理组"
      :width="460"
      :ok-loading="creating"
      ok-text="创建"
      @ok="submitCreate"
    >
      <a-form :model="createForm" layout="vertical">
        <a-form-item label="名称"><a-input v-model="createForm.name" placeholder="手动选择" /></a-form-item>
        <a-form-item label="类型">
          <a-select v-model="createForm.type">
            <a-option v-for="(conf, key) in TYPE_CONFIG" :key="key" :value="key">{{ conf.label }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="启用"><a-switch v-model="createForm.enabled" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.md-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 20px;
  align-items: start;
}

/* 左栏 */
.md-aside {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 140px);
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: 14px;
  padding: 14px;
}
.aside-search { flex: 0 0 auto; }
.md-list { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
.md-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 9px; cursor: pointer;
  border: 1px solid transparent; transition: background .15s;
  &:hover { background: var(--color-fill-2); }
  &.active { background: var(--color-fill-2); border-color: var(--color-border-2); }
}
.pi-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.pi-main { display: flex; flex-direction: column; min-width: 0; }
.pi-name { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pi-sub { font-size: 11px; color: var(--color-text-3); }
.aside-empty { padding: 30px 0; text-align: center; color: var(--color-text-3); font-size: 13px; }
.aside-create { flex: 0 0 auto; }

/* 右栏 */
.md-detail {
  min-width: 0;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: 14px;
  padding: 22px 24px;
  min-height: calc(100vh - 140px);
}
.detail-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 120px 0; color: var(--color-text-3); font-size: 14px;
}
.detail-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding-bottom: 16px; border-bottom: 1px solid var(--color-border-2);
}
.dh-name { font-size: 20px; font-weight: 800; margin: 0 0 6px; }
.dh-summary { margin: 0; font-size: 13px; color: var(--color-text-3); display: flex; align-items: center; gap: 8px; }
.type-chip { font-size: 12px; font-weight: 600; padding: 2px 9px; border-radius: 20px; }
.dh-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

.detail-tabs { margin-top: 8px; }
.tab-form { max-width: 760px; }
.tab-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.tab-hint { font-size: 13px; color: var(--color-text-2); }

/* 双列节点 */
.dual-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 900px; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.section-title { font-size: 13px; font-weight: 600; color: var(--color-text-1); }
.section-count { font-size: 12px; color: var(--color-text-3); }
.node-section {
  border-radius: 10px; border: 1px solid var(--color-border-2);
  max-height: 420px; overflow-y: auto; padding: 4px;
}
.section-empty { padding: 24px; text-align: center; font-size: 13px; color: var(--color-text-3); }
.node-row {
  display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px;
  cursor: pointer; transition: background .15s;
  &:hover { background: var(--color-fill-2); }
  &.active { background: var(--color-fill-2); }
}
.node-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.node-row-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.node-type-badge { font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 5px; flex-shrink: 0; letter-spacing: .3px; }

@media (max-width: 900px) {
  .md-shell { grid-template-columns: 1fr; }
  .md-aside { position: static; height: auto; max-height: 320px; }
  .dual-cols { grid-template-columns: 1fr; }
}
</style>
