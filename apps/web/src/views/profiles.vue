<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Message, Modal } from "@arco-design/web-vue";
import { profileApi, type Profile } from "@/api/profiles";
import { groupApi, type ProxyGroup } from "@/api/groups";
import { ruleApi, type Rule } from "@/api/rules";
import { useConfigStore } from "@/stores/config";

const config = useConfigStore();
const list = ref<Profile[]>([]);
const loading = ref(false);

const modalVisible = ref(false);
const editing = ref<Profile | null>(null);
const form = ref({ name: "", enabled: true });
const submitting = ref(false);

const bindModalVisible = ref(false);
const currentProfile = ref<Profile | null>(null);
const allGroups = ref<ProxyGroup[]>([]);
const allRules = ref<Rule[]>([]);
const bindGroups = ref<string[]>([]);
const bindRules = ref<string[]>([]);
const bindSaving = ref(false);
const bindLoading = ref(false);

const GRAD = [
  "linear-gradient(135deg, #4080ff 0%, #7c3aed 100%)",
  "linear-gradient(135deg, #0ea5e9 0%, #059669 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
];

function cardGrad(index: number) { return GRAD[index % GRAD.length]; }

async function load() {
  loading.value = true;
  try { list.value = await profileApi.list(); }
  finally { loading.value = false; }
}

function openCreate() {
  editing.value = null;
  form.value = { name: "", enabled: true };
  modalVisible.value = true;
}

function openEdit(row: Profile) {
  editing.value = row;
  form.value = { name: row.name, enabled: row.enabled };
  modalVisible.value = true;
}

async function submitForm() {
  if (!form.value.name.trim()) { Message.warning("请填写方案名称"); return; }
  submitting.value = true;
  try {
    if (editing.value) {
      await profileApi.update(editing.value.id, form.value);
    } else {
      await profileApi.create(form.value);
    }
    Message.success(editing.value ? "已更新" : "已创建");
    modalVisible.value = false;
    await load();
  } finally { submitting.value = false; }
}

function confirmDelete(row: Profile) {
  Modal.confirm({
    title: `删除方案「${row.name}」？`,
    okText: "确认删除",
    okButtonProps: { status: "danger" },
    onOk: async () => { await profileApi.remove(row.id); Message.success("已删除"); await load(); },
  });
}

function regenerateToken(row: Profile) {
  Modal.confirm({
    title: "重新生成 Token？",
    content: "旧的订阅链接将立即失效，Mihomo 需要重新导入。",
    onOk: async () => {
      const updated = await profileApi.regenerateToken(row.id);
      const target = list.value.find((p) => p.id === row.id);
      if (target) target.token = updated.token;
      Message.success("Token 已更新");
    },
  });
}

async function openBindModal(row: Profile) {
  currentProfile.value = row;
  bindModalVisible.value = true;
  bindLoading.value = true;
  try {
    const [detail, groups, rules] = await Promise.all([
      profileApi.get(row.id), groupApi.list(), ruleApi.list(),
    ]);
    allGroups.value = groups;
    allRules.value = rules;
    bindGroups.value = (detail.groups ?? []).map((g) => g.id);
    bindRules.value = (detail.rules ?? []).map((r) => r.id);
  } finally { bindLoading.value = false; }
}

async function saveBind() {
  if (!currentProfile.value) return;
  bindSaving.value = true;
  try {
    await profileApi.bind(currentProfile.value.id, { groupIds: bindGroups.value, ruleIds: bindRules.value });
    Message.success("绑定已保存");
    bindModalVisible.value = false;
    await load();
  } finally { bindSaving.value = false; }
}

function publishUrl(token: string) {
  return `${config.serverUrl.replace(/\/$/, "")}/publish/${token}.yaml`;
}

function copyUrl(token: string) {
  navigator.clipboard.writeText(publishUrl(token));
  Message.success("订阅链接已复制");
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h2 class="page-title">配置方案</h2>
        <p class="page-desc">每个方案对应一个独立的 Mihomo 订阅链接</p>
      </div>
      <a-button type="primary" size="large" @click="openCreate">
        <template #icon><icon-plus /></template>
        新建方案
      </a-button>
    </div>

    <a-spin :loading="loading" style="display:block;width:100%">
      <div class="profile-grid">
        <div v-for="(p, index) in list" :key="p.id" class="profile-card">
          <div class="profile-banner" :style="{ background: cardGrad(index) }">
            <span class="profile-name">{{ p.name }}</span>
            <a-tag :color="p.enabled ? 'green' : 'gray'" size="small">
              {{ p.enabled ? "已启用" : "已禁用" }}
            </a-tag>
          </div>

          <div class="profile-body">
            <div class="profile-stats">
              <div class="stat-chip">
                <icon-layers style="color:#4080ff" />
                <span>{{ p._count?.groups ?? 0 }} 个代理组</span>
              </div>
              <div class="stat-chip">
                <icon-filter style="color:#7c3aed" />
                <span>{{ p._count?.rules ?? 0 }} 条规则</span>
              </div>
            </div>

            <div class="url-row">
              <span class="url-label">订阅链接</span>
              <div class="url-box">
                <span class="url-text">{{ publishUrl(p.token) }}</span>
                <a-button type="primary" size="mini" @click="copyUrl(p.token)">
                  <template #icon><icon-copy /></template>
                  复制
                </a-button>
              </div>
            </div>

            <div class="profile-actions">
              <a-button size="small" @click="openBindModal(p)">
                <template #icon><icon-link /></template>
                绑定组/规则
              </a-button>
              <a-button size="small" @click="openEdit(p)">
                <template #icon><icon-edit /></template>
                编辑
              </a-button>
              <a-button size="small" @click="regenerateToken(p)">
                <template #icon><icon-refresh /></template>
                刷新 Token
              </a-button>
              <a-button size="small" status="danger" @click="confirmDelete(p)">
                <template #icon><icon-delete /></template>
              </a-button>
            </div>
          </div>
        </div>

        <div v-if="!loading && list.length === 0" class="empty-card">
          <icon-subscription style="font-size:40px;color:#bbb;margin-bottom:12px" />
          <p>还没有配置方案，点击右上角新建</p>
        </div>
      </div>
    </a-spin>

    <!-- 新建/编辑 -->
    <a-modal v-model:visible="modalVisible" :title="editing ? '编辑方案' : '新建方案'" @ok="submitForm" :ok-loading="submitting">
      <a-form layout="vertical">
        <a-form-item label="方案名称">
          <a-input v-model="form.name" placeholder="我的订阅" />
        </a-form-item>
        <a-form-item label="启用">
          <a-switch v-model="form.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 绑定弹窗 -->
    <a-modal
      v-model:visible="bindModalVisible"
      :title="`绑定 — ${currentProfile?.name}`"
      width="680px"
      @ok="saveBind"
      :ok-loading="bindSaving"
    >
      <a-spin :loading="bindLoading">
        <a-row :gutter="20">
          <a-col :span="12">
            <p class="bind-title">代理组</p>
            <div class="bind-list">
              <label
                v-for="g in allGroups"
                :key="g.id"
                class="bind-item"
                :class="{ selected: bindGroups.includes(g.id) }"
                @click="bindGroups.includes(g.id) ? bindGroups.splice(bindGroups.indexOf(g.id), 1) : bindGroups.push(g.id)"
              >
                <span class="bind-name">{{ g.name }}</span>
                <a-tag size="small">{{ g.type }}</a-tag>
                <icon-check v-if="bindGroups.includes(g.id)" style="color:#4080ff;margin-left:auto" />
              </label>
            </div>
          </a-col>
          <a-col :span="12">
            <p class="bind-title">规则 <span class="bind-subtitle">（{{ bindRules.length }}/{{ allRules.length }}）</span></p>
            <div class="bind-list">
              <label
                v-for="r in allRules"
                :key="r.id"
                class="bind-item"
                :class="{ selected: bindRules.includes(r.id) }"
                @click="bindRules.includes(r.id) ? bindRules.splice(bindRules.indexOf(r.id), 1) : bindRules.push(r.id)"
              >
                <span class="bind-name">{{ r.type }}{{ r.value ? `,${r.value}` : "" }}</span>
                <span class="bind-policy">{{ r.policy }}</span>
                <icon-check v-if="bindRules.includes(r.id)" style="color:#4080ff;margin-left:auto" />
              </label>
            </div>
          </a-col>
        </a-row>
      </a-spin>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
}
.page-title { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
.page-desc { margin: 0; font-size: 13px; color: var(--color-text-3); }

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.profile-card {
  border-radius: 16px;
  border: 1px solid var(--color-border-2);
  overflow: hidden;
  background: var(--color-bg-1);
  transition: box-shadow 0.2s, transform 0.2s;
  &:hover { box-shadow: 0 6px 24px rgba(0,0,0,.1); transform: translateY(-2px); }
}

.profile-banner {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.profile-name {
  font-size: 18px;
  font-weight: 800;
  color: #fff;
}

.profile-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.profile-stats { display: flex; gap: 12px; }

.stat-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--color-text-2);
  background: var(--color-fill-2);
  padding: 4px 10px;
  border-radius: 8px;
}

.url-label { font-size: 12px; color: var(--color-text-3); margin-bottom: 6px; display: block; }

.url-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-fill-2);
  border-radius: 8px;
  padding: 8px 12px;
}

.url-text {
  flex: 1;
  font-size: 11px;
  color: var(--color-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
}

.profile-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.empty-card {
  grid-column: 1/-1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  border-radius: 16px;
  border: 2px dashed var(--color-border-2);
  color: var(--color-text-3);
  font-size: 14px;
}

.bind-title {
  font-weight: 700;
  font-size: 14px;
  margin: 0 0 10px;
}
.bind-subtitle { font-weight: 400; color: var(--color-text-3); font-size: 12px; }

.bind-list {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bind-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s;
  &:hover { background: var(--color-fill-2); }
  &.selected {
    background: #eff6ff;
    border-color: #bfdbfe;
  }
}

.bind-name {
  flex: 1;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bind-policy {
  font-size: 11px;
  color: var(--color-text-3);
  background: var(--color-fill-2);
  padding: 2px 6px;
  border-radius: 4px;
}

body:not([arco-theme="dark"]) .profile-card { background: #fff; }
body:not([arco-theme="dark"]) .bind-item.selected { background: #eff6ff; border-color: #bfdbfe; }
</style>
