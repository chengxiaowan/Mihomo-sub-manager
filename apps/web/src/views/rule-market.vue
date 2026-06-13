<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Message, Modal } from "@arco-design/web-vue";
import { ruleTemplateApi, type RuleTemplate, type RuleTemplateItem } from "@/api/rule-templates";
import { profileApi, type Profile } from "@/api/profiles";
import { groupApi, type ProxyGroup } from "@/api/groups";

const list = ref<RuleTemplate[]>([]);
const loading = ref(false);

// 新建/编辑模板
const modalVisible = ref(false);
const editing = ref<RuleTemplate | null>(null);
const form = ref({ name: "", description: "" });
const submitting = ref(false);

// 编辑条目
const itemsVisible = ref(false);
const currentTemplate = ref<RuleTemplate | null>(null);
const items = ref<RuleTemplateItem[]>([]);
const itemsLoading = ref(false);
const newItemType = ref("DOMAIN-SUFFIX");
const newItemValue = ref("");
const itemsSaving = ref(false);

const RULE_TYPES = ["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "IP-CIDR", "IP-CIDR6", "GEOIP", "PROCESS-NAME"];

// 导入到 Profile
const importVisible = ref(false);
const importTemplate = ref<RuleTemplate | null>(null);
const allProfiles = ref<Profile[]>([]);
const importProfileId = ref("");
const importPolicy = ref("");
const importMode = ref<"append" | "overwrite">("append");
const importLoading = ref(false);
const importSaving = ref(false);

const profileGroups = ref<ProxyGroup[]>([]);
const BUILTIN_POLICIES = ["DIRECT", "REJECT", "REJECT-DROP", "PASS"];

async function load() {
  loading.value = true;
  try { list.value = await ruleTemplateApi.list(); }
  finally { loading.value = false; }
}

function openCreate() {
  editing.value = null; form.value = { name: "", description: "" }; modalVisible.value = true;
}
function openEdit(t: RuleTemplate) {
  editing.value = t; form.value = { name: t.name, description: t.description ?? "" }; modalVisible.value = true;
}
async function submitForm() {
  if (!form.value.name.trim()) { Message.warning("请填写模板名称"); return; }
  submitting.value = true;
  try {
    editing.value
      ? await ruleTemplateApi.update(editing.value.id, form.value)
      : await ruleTemplateApi.create(form.value);
    Message.success(editing.value ? "已更新" : "已创建");
    modalVisible.value = false; await load();
  } finally { submitting.value = false; }
}
function confirmDelete(t: RuleTemplate) {
  Modal.confirm({
    title: `删除「${t.name}」？`, content: "删除后无法恢复。",
    okText: "确认删除", okButtonProps: { status: "danger" },
    onOk: async () => { await ruleTemplateApi.remove(t.id); Message.success("已删除"); await load(); },
  });
}

// 编辑条目
async function openItems(t: RuleTemplate) {
  currentTemplate.value = t; itemsVisible.value = true; itemsLoading.value = true;
  newItemType.value = "DOMAIN-SUFFIX"; newItemValue.value = "";
  try {
    const detail = await ruleTemplateApi.get(t.id);
    items.value = detail.items ?? [];
  } finally { itemsLoading.value = false; }
}

async function addItem() {
  if (!newItemValue.value.trim()) { Message.warning("请填写匹配值"); return; }
  const newItems = [...items.value, { id: "", type: newItemType.value, value: newItemValue.value, sort: items.value.length, templateId: currentTemplate.value!.id }];
  itemsSaving.value = true;
  try {
    await ruleTemplateApi.update(currentTemplate.value!.id, {
      items: newItems.map((i) => ({ type: i.type, value: i.value ?? "" })),
    });
    const detail = await ruleTemplateApi.get(currentTemplate.value!.id);
    items.value = detail.items ?? [];
    newItemValue.value = "";
    await load();
  } finally { itemsSaving.value = false; }
}

async function removeItem(item: RuleTemplateItem) {
  const newItems = items.value.filter((i) => i.id !== item.id);
  itemsSaving.value = true;
  try {
    await ruleTemplateApi.update(currentTemplate.value!.id, {
      items: newItems.map((i) => ({ type: i.type, value: i.value ?? "" })),
    });
    items.value = newItems;
    await load();
  } finally { itemsSaving.value = false; }
}

// 导入到 Profile
async function openImport(t: RuleTemplate) {
  importTemplate.value = t; importVisible.value = true; importLoading.value = true;
  importMode.value = "append"; importPolicy.value = ""; importProfileId.value = ""; profileGroups.value = [];
  try {
    allProfiles.value = await profileApi.list();
  } finally { importLoading.value = false; }
}

async function onProfileChange(id: unknown) {
  const profileId = String(id);
  importProfileId.value = profileId; importPolicy.value = "";
  if (!profileId) { profileGroups.value = []; return; }
  const [detail, groups] = await Promise.all([profileApi.get(profileId), groupApi.list()]);
  const boundIds = new Set((detail.groups ?? []).map((g) => g.id));
  profileGroups.value = groups.filter((g) => boundIds.has(g.id));
}

async function doImport() {
  if (!importProfileId.value || !importPolicy.value) { Message.warning("请选择配置方案和去向"); return; }
  importSaving.value = true;
  try {
    const r = await ruleTemplateApi.import(importTemplate.value!.id, {
      profileId: importProfileId.value,
      policy: importPolicy.value,
      mode: importMode.value,
    });
    Message.success(`已导入 ${r.imported} 条规则`);
    importVisible.value = false;
  } finally { importSaving.value = false; }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h2 class="page-title">规则市场</h2>
        <p class="page-desc">管理规则模板，一键导入到配置方案</p>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><icon-plus /></template>新建模板
      </a-button>
    </div>

    <a-spin :loading="loading" style="display:block;width:100%">
      <div class="market-grid">
        <div v-for="t in list" :key="t.id" class="market-card">
          <div class="card-head">
            <span class="card-name">{{ t.name }}</span>
            <span class="card-count">{{ t._count?.items ?? 0 }} 条</span>
          </div>
          <p class="card-desc">{{ t.description || "暂无描述" }}</p>
          <div class="card-foot">
            <a-button size="small" type="primary" @click="openImport(t)">
              <template #icon><icon-download /></template>导入
            </a-button>
            <a-button size="small" @click="openItems(t)">
              <template #icon><icon-edit /></template>编辑条目
            </a-button>
            <a-button size="small" @click="openEdit(t)"><template #icon><icon-settings /></template></a-button>
            <a-button size="small" status="danger" @click="confirmDelete(t)"><template #icon><icon-delete /></template></a-button>
          </div>
        </div>
        <div v-if="!loading && list.length === 0" class="market-empty">
          <icon-storage style="font-size:36px;color:#ccc;margin-bottom:12px" />
          <p>还没有规则模板，点击右上角新建</p>
        </div>
      </div>
    </a-spin>

    <!-- 新建/编辑模板 -->
    <a-modal v-model:visible="modalVisible" :title="editing ? '编辑模板' : '新建规则模板'" @ok="submitForm" :ok-loading="submitting">
      <a-form :model="form" layout="vertical">
        <a-form-item label="模板名称"><a-input v-model="form.name" placeholder="AI规则" /></a-form-item>
        <a-form-item label="描述"><a-input v-model="form.description" placeholder="OpenAI、Claude 等 AI 服务" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 编辑条目 -->
    <a-modal v-model:visible="itemsVisible" :title="`编辑条目 — ${currentTemplate?.name}`" width="600px" :footer="false">
      <a-spin :loading="itemsLoading" style="display:block">
        <div class="add-item-row">
          <a-select v-model="newItemType" style="width:160px">
            <a-option v-for="t in RULE_TYPES" :key="t" :value="t">{{ t }}</a-option>
          </a-select>
          <a-input v-model="newItemValue" placeholder="openai.com" style="flex:1" @press-enter="addItem" />
          <a-button type="primary" :loading="itemsSaving" @click="addItem">
            <template #icon><icon-plus /></template>添加
          </a-button>
        </div>
        <div class="items-list">
          <div v-if="!itemsLoading && items.length === 0" class="items-empty">还没有条目</div>
          <div v-for="item in items" :key="item.id" class="item-row">
            <span class="item-type">{{ item.type }}</span>
            <span class="item-value">{{ item.value }}</span>
            <a-button size="mini" status="danger" :loading="itemsSaving" @click="removeItem(item)">
              <template #icon><icon-delete /></template>
            </a-button>
          </div>
        </div>
      </a-spin>
    </a-modal>

    <!-- 导入到 Profile -->
    <a-modal v-model:visible="importVisible" :title="`导入「${importTemplate?.name}」`" @ok="doImport" :ok-loading="importSaving">
      <a-spin :loading="importLoading" style="display:block">
        <a-form :model="form" layout="vertical">
          <a-form-item label="目标配置方案">
            <a-select :model-value="importProfileId" placeholder="选择配置方案" @change="onProfileChange">
              <a-option v-for="p in allProfiles" :key="p.id" :value="p.id">{{ p.name }}</a-option>
            </a-select>
          </a-form-item>
          <a-form-item label="去向（规则的 policy）">
            <a-select v-model="importPolicy" placeholder="选择代理组或内置策略" allow-search :disabled="!importProfileId">
              <a-optgroup label="内置策略">
                <a-option v-for="p in BUILTIN_POLICIES" :key="p" :value="p">{{ p }}</a-option>
              </a-optgroup>
              <a-optgroup label="该方案的代理组">
                <a-option v-for="g in profileGroups" :key="g.id" :value="g.name">{{ g.name }}</a-option>
              </a-optgroup>
            </a-select>
            <template #extra v-if="importProfileId && profileGroups.length === 0">
              该方案还没有绑定代理组，请先去配置方案页绑定
            </template>
          </a-form-item>
          <a-form-item label="导入方式">
            <a-radio-group v-model="importMode">
              <a-radio value="append">追加（保留已有规则，新增条目）</a-radio>
              <a-radio value="overwrite">覆盖（删除相同去向的旧规则，重新导入）</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-form>
      </a-spin>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; }
.page-title { font-size:20px; font-weight:700; margin:0 0 4px; }
.page-desc { margin:0; font-size:13px; color:var(--color-text-3); }

.market-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }

.market-card {
  background:var(--color-bg-1); border:1px solid var(--color-border-2);
  border-radius:12px; padding:18px 20px;
  display:flex; flex-direction:column; gap:10px;
  transition:box-shadow .18s;
  &:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); }
}
.card-head { display:flex; align-items:center; justify-content:space-between; }
.card-name { font-size:15px; font-weight:700; }
.card-count { font-size:12px; color:var(--color-text-3); background:var(--color-fill-2); padding:2px 8px; border-radius:10px; }
.card-desc { margin:0; font-size:12px; color:var(--color-text-3); }
.card-foot { display:flex; gap:6px; padding-top:8px; border-top:1px solid var(--color-border-2); flex-wrap:wrap; }

.market-empty {
  grid-column:1/-1; display:flex; flex-direction:column; align-items:center;
  padding:60px 0; color:var(--color-text-3); font-size:14px;
}

.add-item-row { display:flex; gap:8px; margin-bottom:12px; }
.items-list { display:flex; flex-direction:column; gap:4px; max-height:360px; overflow-y:auto; }
.items-empty { padding:30px; text-align:center; color:var(--color-text-3); font-size:13px; }
.item-row {
  display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:8px;
  &:hover { background:var(--color-fill-2); }
}
.item-type { font-size:11px; font-weight:700; color:#4080ff; background:#eff6ff; padding:2px 7px; border-radius:5px; flex-shrink:0; }
.item-value { flex:1; font-size:13px; }

body:not([arco-theme="dark"]) .market-card { background:#fff; }
</style>
