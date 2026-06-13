<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Message, Modal } from "@arco-design/web-vue";
import { groupApi, type ProxyGroup } from "@/api/groups";
import { nodeApi, type ProxyNode } from "@/api/nodes";

const list = ref<ProxyGroup[]>([]);
const loading = ref(false);

const modalVisible = ref(false);
const editing = ref<ProxyGroup | null>(null);
const form = ref({ name: "", type: "select", enabled: true });
const submitting = ref(false);

const nodeModalVisible = ref(false);
const currentGroup = ref<ProxyGroup | null>(null);
const allNodes = ref<ProxyNode[]>([]);
const selectedNodeIds = ref<string[]>([]);
const nodeLoading = ref(false);
const nodeSaving = ref(false);
const nodeKeyword = ref("");

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  "select":       { label: "手动选择", color: "#1677ff", bg: "#e6f4ff" },
  "url-test":     { label: "自动测速", color: "#00b96b", bg: "#e6fff5" },
  "fallback":     { label: "故障转移", color: "#fa8c16", bg: "#fff7e6" },
  "load-balance": { label: "负载均衡", color: "#722ed1", bg: "#f9f0ff" },
};

const TYPE_COLORS: Record<string, string> = {
  vmess: "#1677ff", vless: "#722ed1", trojan: "#d46b08", ss: "#389e0d",
};

function typeConf(type: string) {
  return TYPE_CONFIG[type] ?? { label: type, color: "#595959", bg: "#f5f5f5" };
}

const kw = computed(() => nodeKeyword.value.trim().toLowerCase());

const selectedNodes = computed(() =>
  allNodes.value.filter((n) => selectedNodeIds.value.includes(n.id) && (!kw.value || n.name.toLowerCase().includes(kw.value)))
);

const availableNodes = computed(() =>
  allNodes.value.filter((n) => !selectedNodeIds.value.includes(n.id) && (!kw.value || n.name.toLowerCase().includes(kw.value)))
);

function addNode(id: string) { if (!selectedNodeIds.value.includes(id)) selectedNodeIds.value.push(id); }
function removeNode(id: string) { selectedNodeIds.value = selectedNodeIds.value.filter((v) => v !== id); }

async function load() {
  loading.value = true;
  try { list.value = await groupApi.list(); }
  finally { loading.value = false; }
}

function openCreate() {
  editing.value = null; form.value = { name: "", type: "select", enabled: true }; modalVisible.value = true;
}
function openEdit(row: ProxyGroup) {
  editing.value = row; form.value = { name: row.name, type: row.type, enabled: row.enabled }; modalVisible.value = true;
}

async function submitForm() {
  if (!form.value.name.trim()) { Message.warning("请填写代理组名称"); return; }
  submitting.value = true;
  try {
    editing.value ? await groupApi.update(editing.value.id, form.value) : await groupApi.create(form.value);
    Message.success(editing.value ? "已更新" : "已创建");
    modalVisible.value = false; await load();
  } finally { submitting.value = false; }
}

function confirmDelete(row: ProxyGroup) {
  Modal.confirm({
    title: `删除代理组「${row.name}」？`, okText: "确认删除", okButtonProps: { status: "danger" },
    onOk: async () => { await groupApi.remove(row.id); Message.success("已删除"); await load(); },
  });
}

async function openNodeModal(row: ProxyGroup) {
  currentGroup.value = row; nodeKeyword.value = "";
  nodeModalVisible.value = true; nodeLoading.value = true;
  try {
    const [detail, page] = await Promise.all([groupApi.get(row.id), nodeApi.list({ pageSize: 9999 })]);
    allNodes.value = page.items;
    selectedNodeIds.value = (detail.nodes ?? []).map((n) => n.id);
  } finally { nodeLoading.value = false; }
}

async function saveNodes() {
  if (!currentGroup.value) return;
  nodeSaving.value = true;
  try {
    await groupApi.setNodes(currentGroup.value.id, selectedNodeIds.value);
    Message.success("节点已保存");
    nodeModalVisible.value = false; await load();
  } finally { nodeSaving.value = false; }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h2 class="page-title">代理组</h2>
        <p class="page-desc">管理代理策略组及成员节点</p>
      </div>
      <a-button type="primary" size="large" @click="openCreate">
        <template #icon><icon-plus /></template>创建代理组
      </a-button>
    </div>

    <a-spin :loading="loading" style="display:block;width:100%">
      <div class="group-grid">
        <div v-for="group in list" :key="group.id" class="group-card">
          <div class="group-card-accent" :style="{ background: typeConf(group.type).color }" />
          <div class="group-body">
            <div class="group-header">
              <span class="group-name">{{ group.name }}</span>
              <a-switch
                :model-value="group.enabled" size="small"
                @change="async (v: boolean) => { await groupApi.update(group.id, { enabled: v }); group.enabled = v; }"
              />
            </div>
            <span class="type-chip" :style="{ color: typeConf(group.type).color, background: typeConf(group.type).bg }">
              {{ typeConf(group.type).label }}
            </span>
            <div class="node-count-row">
              <div class="node-bubbles">
                <span
                  v-for="(node, i) in (group.nodes ?? []).slice(0, 6)" :key="node.id"
                  class="node-bubble"
                  :style="{ background: TYPE_COLORS[node.type] ?? '#999', zIndex: 6 - i }"
                  :title="node.name"
                />
              </div>
              <span class="node-count-label">{{ group._count?.nodes ?? 0 }} 个节点</span>
            </div>
            <div class="group-actions">
              <a-button size="small" type="primary" @click="openNodeModal(group)">
                <template #icon><icon-layers /></template>管理节点
              </a-button>
              <a-button size="small" @click="openEdit(group)"><template #icon><icon-edit /></template></a-button>
              <a-button size="small" status="danger" @click="confirmDelete(group)"><template #icon><icon-delete /></template></a-button>
            </div>
          </div>
        </div>
        <div v-if="!loading && list.length === 0" class="empty-card">
          <icon-layers style="font-size:40px;color:#bbb;margin-bottom:12px" />
          <p>还没有代理组，点击右上角创建</p>
        </div>
      </div>
    </a-spin>

    <!-- 创建/编辑 -->
    <a-modal v-model:visible="modalVisible" :title="editing ? '编辑代理组' : '创建代理组'" @ok="submitForm" :ok-loading="submitting">
      <a-form layout="vertical">
        <a-form-item label="名称"><a-input v-model="form.name" placeholder="手动选择" /></a-form-item>
        <a-form-item label="类型">
          <a-select v-model="form.type">
            <a-option v-for="(conf, key) in TYPE_CONFIG" :key="key" :value="key">{{ conf.label }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="启用"><a-switch v-model="form.enabled" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 节点管理 -->
    <a-modal
      v-model:visible="nodeModalVisible"
      :title="`管理节点 — ${currentGroup?.name}`"
      width="580px"
      @ok="saveNodes"
      :ok-loading="nodeSaving"
    >
      <a-spin :loading="nodeLoading" style="display:block;width:100%">
        <a-input
          v-model="nodeKeyword"
          placeholder="搜索节点名称"
          allow-clear
          style="margin-bottom:16px"
        >
          <template #prefix><icon-search /></template>
        </a-input>

        <!-- 已选区域 -->
        <div class="section-header">
          <span class="section-title">已选节点</span>
          <span class="section-count">{{ selectedNodeIds.length }} 个</span>
        </div>
        <div class="node-section">
          <div v-if="selectedNodes.length === 0" class="section-empty">
            {{ selectedNodeIds.length === 0 ? '暂未选择任何节点' : '无匹配结果' }}
          </div>
          <div v-for="node in selectedNodes" :key="node.id" class="node-row">
            <span class="node-dot" :style="{ background: TYPE_COLORS[node.type] ?? '#999' }" />
            <span class="node-row-name">{{ node.name }}</span>
            <span class="node-row-type">{{ node.type }}</span>
            <a-button size="mini" status="danger" @click="removeNode(node.id)">
              <template #icon><icon-minus /></template>
            </a-button>
          </div>
        </div>

        <div style="height:12px" />

        <!-- 可用区域 -->
        <div class="section-header">
          <span class="section-title">可用节点</span>
          <span class="section-count">{{ availableNodes.length }} 个</span>
        </div>
        <div class="node-section">
          <div v-if="availableNodes.length === 0" class="section-empty">
            {{ nodeKeyword ? '无匹配结果' : '全部节点已添加' }}
          </div>
          <div v-for="node in availableNodes" :key="node.id" class="node-row">
            <span class="node-dot" :style="{ background: TYPE_COLORS[node.type] ?? '#999' }" />
            <span class="node-row-name">{{ node.name }}</span>
            <span class="node-row-type">{{ node.type }}</span>
            <a-button size="mini" type="primary" @click="addNode(node.id)">
              <template #icon><icon-plus /></template>
            </a-button>
          </div>
        </div>
      </a-spin>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; }
.page-title { font-size:22px; font-weight:800; margin:0 0 4px; }
.page-desc { margin:0; font-size:13px; color:var(--color-text-3); }

.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.group-card {
  border-radius: 14px; border: 1px solid var(--color-border-2);
  background: var(--color-bg-1); overflow: hidden; display: flex;
  transition: box-shadow 0.2s, transform 0.2s;
  &:hover { box-shadow: 0 4px 20px rgba(0,0,0,.09); transform: translateY(-2px); }
}
.group-card-accent { width: 5px; flex-shrink: 0; }
.group-body { flex:1; padding:18px 16px; display:flex; flex-direction:column; gap:12px; }
.group-header { display:flex; align-items:center; justify-content:space-between; }
.group-name { font-size:16px; font-weight:700; }
.type-chip { font-size:12px; font-weight:600; padding:3px 10px; border-radius:20px; align-self:flex-start; }
.node-count-row { display:flex; align-items:center; gap:8px; }
.node-bubbles { display:flex; }
.node-bubble {
  width:20px; height:20px; border-radius:50%;
  border:2px solid var(--color-bg-1); margin-left:-6px;
  &:first-child { margin-left:0; }
}
.node-count-label { font-size:12px; color:var(--color-text-3); }
.group-actions { display:flex; gap:8px; }

.empty-card {
  grid-column:1/-1; display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:60px; border-radius:14px; border:2px dashed var(--color-border-2); color:var(--color-text-3); font-size:14px;
}

/* 节点弹窗 */
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 6px;
}
.section-title { font-size: 13px; font-weight: 600; color: var(--color-text-1); }
.section-count { font-size: 12px; color: var(--color-text-3); }

.node-section {
  border-radius: 10px;
  border: 1px solid var(--color-border-2);
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
}

.section-empty {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-3);
}

.node-row {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 8px;
  transition: background 0.15s;
  &:hover { background: var(--color-fill-2); }
}

.selected-row { }
.available-row { }

.node-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.node-row-name { flex:1; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.node-row-type { font-size:11px; color:var(--color-text-3); flex-shrink:0; }

body:not([arco-theme="dark"]) .group-card { background: #fff; }
</style>
