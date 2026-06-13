<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Message, Modal } from "@arco-design/web-vue";
import { ruleApi, type Rule } from "@/api/rules";

const list = ref<Rule[]>([]);
const loading = ref(false);
const modalVisible = ref(false);
const editing = ref<Rule | null>(null);
const form = ref({ type: "DOMAIN-SUFFIX", value: "", policy: "PROXY", enabled: true });
const submitting = ref(false);

const RULE_TYPES = ["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "IP-CIDR", "IP-CIDR6", "GEOIP", "MATCH"];

const TYPE_COLOR: Record<string, string> = {
  DOMAIN:         "#1677ff",
  "DOMAIN-SUFFIX":"#0ea5e9",
  "DOMAIN-KEYWORD":"#06b6d4",
  "IP-CIDR":      "#7c3aed",
  "IP-CIDR6":     "#9333ea",
  GEOIP:          "#059669",
  MATCH:          "#dc2626",
};

function typeColor(type: string) { return TYPE_COLOR[type] ?? "#6b7280"; }

async function load() {
  loading.value = true;
  try { list.value = await ruleApi.list(); }
  finally { loading.value = false; }
}

function openCreate() {
  editing.value = null;
  form.value = { type: "DOMAIN-SUFFIX", value: "", policy: "PROXY", enabled: true };
  modalVisible.value = true;
}

function openEdit(row: Rule) {
  editing.value = row;
  form.value = { type: row.type, value: row.value, policy: row.policy, enabled: row.enabled };
  modalVisible.value = true;
}

async function submitForm() {
  submitting.value = true;
  try {
    if (editing.value) {
      await ruleApi.update(editing.value.id, form.value);
      Message.success("已更新");
    } else {
      await ruleApi.create(form.value);
      Message.success("已添加");
    }
    modalVisible.value = false;
    await load();
  } finally { submitting.value = false; }
}

function confirmDelete(row: Rule) {
  Modal.confirm({
    title: "删除该规则？",
    content: `${row.type}${row.value ? `,${row.value}` : ""},${row.policy}`,
    okText: "确认删除",
    okButtonProps: { status: "danger" },
    onOk: async () => { await ruleApi.remove(row.id); Message.success("已删除"); await load(); },
  });
}

async function moveUp(index: number) {
  if (index === 0) return;
  const ids = list.value.map((r) => r.id);
  [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
  await ruleApi.reorder(ids);
  await load();
}

async function moveDown(index: number) {
  if (index === list.value.length - 1) return;
  const ids = list.value.map((r) => r.id);
  [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
  await ruleApi.reorder(ids);
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h2 class="page-title">规则</h2>
        <p class="page-desc">{{ list.length }} 条规则，按顺序匹配</p>
      </div>
      <a-button type="primary" size="large" @click="openCreate">
        <template #icon><icon-plus /></template>
        添加规则
      </a-button>
    </div>

    <a-spin :loading="loading">
      <div class="rule-list">
        <div v-for="(rule, index) in list" :key="rule.id" class="rule-card" :class="{ disabled: !rule.enabled }">
          <div class="rule-index">{{ index + 1 }}</div>

          <div class="rule-type-wrap">
            <span class="rule-type" :style="{ color: typeColor(rule.type), borderColor: typeColor(rule.type) + '44', background: typeColor(rule.type) + '18' }">
              {{ rule.type }}
            </span>
          </div>

          <div class="rule-body">
            <span class="rule-value">{{ rule.value || "—" }}</span>
            <span class="rule-arrow">→</span>
            <span class="rule-policy">{{ rule.policy }}</span>
          </div>

          <div class="rule-actions">
            <a-switch
              :model-value="rule.enabled"
              size="small"
              @change="async (v: boolean) => { await ruleApi.update(rule.id, { enabled: v }); rule.enabled = v; }"
            />
            <div class="sort-btns">
              <a-button size="mini" :disabled="index === 0" @click="moveUp(index)">
                <template #icon><icon-up /></template>
              </a-button>
              <a-button size="mini" :disabled="index === list.length - 1" @click="moveDown(index)">
                <template #icon><icon-down /></template>
              </a-button>
            </div>
            <a-button size="small" @click="openEdit(rule)">
              <template #icon><icon-edit /></template>
            </a-button>
            <a-button size="small" status="danger" @click="confirmDelete(rule)">
              <template #icon><icon-delete /></template>
            </a-button>
          </div>
        </div>

        <div v-if="!loading && list.length === 0" class="empty-tip">
          <icon-filter style="font-size:36px;color:#bbb;margin-bottom:10px" />
          <p>还没有规则，点击右上角添加</p>
        </div>
      </div>
    </a-spin>

    <a-modal
      v-model:visible="modalVisible"
      :title="editing ? '编辑规则' : '添加规则'"
      @ok="submitForm"
      :ok-loading="submitting"
    >
      <a-form layout="vertical">
        <a-form-item label="类型">
          <a-select v-model="form.type">
            <a-option v-for="t in RULE_TYPES" :key="t" :value="t">
              <span :style="{ color: typeColor(t), fontWeight: 600 }">{{ t }}</span>
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="值" :help="form.type === 'MATCH' ? 'MATCH 类型无需填值' : ''">
          <a-input v-model="form.value" :disabled="form.type === 'MATCH'" placeholder="google.com" />
        </a-form-item>
        <a-form-item label="策略">
          <a-input v-model="form.policy" placeholder="PROXY / DIRECT / REJECT / 代理组名" />
        </a-form-item>
        <a-form-item label="启用">
          <a-switch v-model="form.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}
.page-title { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
.page-desc { margin: 0; font-size: 13px; color: var(--color-text-3); }

.rule-list { display: flex; flex-direction: column; gap: 8px; }

.rule-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  padding: 12px 16px;
  transition: box-shadow 0.2s;
  &:hover { box-shadow: 0 2px 10px rgba(0,0,0,.07); }
  &.disabled { opacity: 0.5; }
}

.rule-index {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--color-fill-2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-3);
  flex-shrink: 0;
}

.rule-type-wrap { flex-shrink: 0; }

.rule-type {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid;
  letter-spacing: 0.3px;
}

.rule-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
}

.rule-value {
  color: var(--color-text-1);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rule-arrow { color: var(--color-text-3); flex-shrink: 0; }

.rule-policy {
  color: var(--color-text-2);
  font-weight: 600;
  flex-shrink: 0;
  padding: 2px 8px;
  background: var(--color-fill-2);
  border-radius: 6px;
}

.rule-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.sort-btns { display: flex; gap: 4px; }

.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px;
  color: var(--color-text-3);
  font-size: 14px;
}

body:not([arco-theme="dark"]) .rule-card { background: #fff; }
body:not([arco-theme="dark"]) .rule-index { background: #f0f4ff; color: #4080ff; }
</style>
