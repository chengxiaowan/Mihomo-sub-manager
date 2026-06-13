<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Message, Modal } from "@arco-design/web-vue";
import { subscriptionApi, type Subscription } from "@/api/subscriptions";

const list = ref<Subscription[]>([]);
const loading = ref(false);
const refreshingId = ref<string | null>(null);
const modalVisible = ref(false);
const editing = ref<Subscription | null>(null);
const form = ref({ name: "", url: "", enabled: true });
const submitting = ref(false);

const STATUS: Record<string, { label: string; color: string }> = {
  success: { label: "正常",   color: "#10b981" },
  error:   { label: "失败",   color: "#ef4444" },
  fetching:{ label: "拉取中", color: "#f59e0b" },
};

function fmtTime(t: string | null) {
  if (!t) return "从未拉取";
  const d = new Date(t);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")} 拉取`;
}

async function load() {
  loading.value = true;
  try { list.value = await subscriptionApi.list(); }
  finally { loading.value = false; }
}

function openCreate() {
  editing.value = null; form.value = { name: "", url: "", enabled: true }; modalVisible.value = true;
}
function openEdit(row: Subscription) {
  editing.value = row; form.value = { name: row.name, url: row.url, enabled: row.enabled }; modalVisible.value = true;
}

async function submitForm() {
  if (!form.value.name.trim() || !form.value.url.trim()) { Message.warning("名称和地址不能为空"); return; }
  submitting.value = true;
  try {
    editing.value ? await subscriptionApi.update(editing.value.id, form.value) : await subscriptionApi.create(form.value);
    Message.success(editing.value ? "已更新" : "已添加");
    modalVisible.value = false; await load();
  } finally { submitting.value = false; }
}

function confirmDelete(row: Subscription) {
  Modal.confirm({
    title: `删除「${row.name}」？`, content: "该订阅源下所有节点也会一并删除。",
    okText: "确认删除", okButtonProps: { status: "danger" },
    onOk: async () => { await subscriptionApi.remove(row.id); Message.success("已删除"); await load(); },
  });
}

async function doRefresh(row: Subscription) {
  refreshingId.value = row.id;
  try {
    const r = await subscriptionApi.refresh(row.id);
    Message.success(`拉取完成，新增 ${r.nodesAdded} 个节点`);
    await load();
  } catch { Message.error("拉取失败"); }
  finally { refreshingId.value = null; }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h2 class="page-title">订阅源</h2>
        <p class="page-desc">管理机场订阅链接</p>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><icon-plus /></template>添加订阅源
      </a-button>
    </div>

    <a-spin :loading="loading" style="display:block;width:100%">
      <div class="sub-grid">
        <div v-for="sub in list" :key="sub.id" class="sub-card">
          <div class="sub-head">
            <span class="sub-name">{{ sub.name }}</span>
            <span v-if="sub.fetchStatus" class="sub-status"
              :style="{ color: STATUS[sub.fetchStatus]?.color ?? '#999' }">
              <span class="status-dot" :style="{ background: STATUS[sub.fetchStatus]?.color ?? '#999' }"></span>
              {{ STATUS[sub.fetchStatus]?.label ?? sub.fetchStatus }}
            </span>
          </div>

          <p class="sub-url">{{ sub.url }}</p>

          <div class="sub-foot">
            <span class="sub-time">{{ fmtTime(sub.lastFetchedAt) }}</span>
            <div class="sub-actions">
              <a-button size="small" :loading="refreshingId === sub.id" @click="doRefresh(sub)">
                <template #icon><icon-refresh /></template>拉取
              </a-button>
              <a-button size="small" @click="openEdit(sub)">编辑</a-button>
              <a-button size="small" status="danger" @click="confirmDelete(sub)">
                <template #icon><icon-delete /></template>
              </a-button>
            </div>
          </div>
        </div>

        <div v-if="!loading && list.length === 0" class="sub-empty">
          <icon-cloud-download style="font-size:36px;color:#ccc;margin-bottom:12px" />
          <p>还没有订阅源</p>
          <a-button type="primary" style="margin-top:12px" @click="openCreate">立即添加</a-button>
        </div>
      </div>
    </a-spin>

    <a-modal v-model:visible="modalVisible" :title="editing ? '编辑订阅源' : '添加订阅源'" @ok="submitForm" :ok-loading="submitting">
      <a-form layout="vertical">
        <a-form-item label="名称"><a-input v-model="form.name" placeholder="机场A" /></a-form-item>
        <a-form-item label="订阅地址"><a-input v-model="form.url" placeholder="https://..." /></a-form-item>
        <a-form-item label="启用"><a-switch v-model="form.enabled" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; }
.page-title { font-size:20px; font-weight:700; margin:0 0 4px; }
.page-desc { margin:0; font-size:13px; color:var(--color-text-3); }

.sub-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}

.sub-card {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow .18s;
  &:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
}

.sub-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.sub-name { font-size:15px; font-weight:700; color:var(--color-text-1); }

.sub-status {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; flex-shrink: 0;
}
.status-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

.sub-url {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.sub-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid var(--color-border-2);
}

.sub-time { font-size:12px; color:var(--color-text-3); }
.sub-actions { display:flex; gap:6px; }

.sub-empty {
  grid-column: 1/-1;
  display: flex; flex-direction: column; align-items: center;
  padding: 60px 0;
  color: var(--color-text-3); font-size:14px;
}
</style>
