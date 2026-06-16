<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Message, Modal } from "@arco-design/web-vue";
import { ruleTemplateApi, type RuleTemplate, type RuleTemplateItem } from "@/api/rule-templates";
import { profileApi, type Profile } from "@/api/profiles";
import { groupApi, type ProxyGroup } from "@/api/groups";

const RULE_TYPES = ["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "IP-CIDR", "IP-CIDR6", "GEOIP", "PROCESS-NAME"];
const BUILTIN_POLICIES = ["DIRECT", "REJECT", "REJECT-DROP", "PASS"];

// ── 列表（左栏） ──────────────────────────────────────────────
const list = ref<RuleTemplate[]>([]);
const loading = ref(false);
const search = ref("");
const selectedId = ref<string | null>(null);

const filteredList = computed(() => {
  const kw = search.value.trim().toLowerCase();
  return kw ? list.value.filter((t) => t.name.toLowerCase().includes(kw)) : list.value;
});

// ── 详情（右栏） ──────────────────────────────────────────────
const detail = ref<RuleTemplate | null>(null);
const detailLoading = ref(false);
const activeTab = ref("info");

const infoForm = ref({ name: "", description: "" });
const infoSaving = ref(false);

const items = ref<RuleTemplateItem[]>([]);
const newItemType = ref("DOMAIN-SUFFIX");
const newItemValue = ref("");
const itemsSaving = ref(false);

// ── 新建模板抽屉 ──────────────────────────────────────────────
const createVisible = ref(false);
const createForm = ref({ name: "", description: "" });
const creating = ref(false);

// ── 导入抽屉 ──────────────────────────────────────────────────
const importVisible = ref(false);
const allProfiles = ref<Profile[]>([]);
const importProfileId = ref("");
const importPolicy = ref("");
const importMode = ref<"append" | "overwrite">("append");
const importForm = ref({}); // a-form 占位 model（字段用各自 ref 双向绑定）
const importLoading = ref(false);
const importSaving = ref(false);
const profileGroups = ref<ProxyGroup[]>([]);

function patchListItem(id: string, patch: Partial<RuleTemplate>) {
  const t = list.value.find((x) => x.id === id);
  if (t) Object.assign(t, patch);
}

async function load() {
  loading.value = true;
  try {
    list.value = await ruleTemplateApi.list();
    if (list.value.length) {
      const stillExists = list.value.some((t) => t.id === selectedId.value);
      await selectTemplate(stillExists ? selectedId.value! : list.value[0].id);
    } else {
      selectedId.value = null;
      detail.value = null;
    }
  } finally {
    loading.value = false;
  }
}

async function selectTemplate(id: string) {
  selectedId.value = id;
  detailLoading.value = true;
  newItemType.value = "DOMAIN-SUFFIX";
  newItemValue.value = "";
  try {
    const d = await ruleTemplateApi.get(id);
    detail.value = d;
    infoForm.value = { name: d.name, description: d.description ?? "" };
    items.value = d.items ?? [];
  } finally {
    detailLoading.value = false;
  }
}

async function saveInfo() {
  if (!detail.value) return;
  if (!infoForm.value.name.trim()) {
    Message.warning("请填写模板名称");
    return;
  }
  infoSaving.value = true;
  try {
    const updated = await ruleTemplateApi.update(detail.value.id, {
      name: infoForm.value.name,
      description: infoForm.value.description,
    });
    detail.value = { ...detail.value, ...updated, items: items.value };
    patchListItem(detail.value.id, { name: updated.name, description: updated.description });
    Message.success("已保存");
  } finally {
    infoSaving.value = false;
  }
}

async function persistItems(next: RuleTemplateItem[]) {
  itemsSaving.value = true;
  try {
    await ruleTemplateApi.update(detail.value!.id, {
      items: next.map((i) => ({ type: i.type, value: i.value ?? "" })),
    });
    const d = await ruleTemplateApi.get(detail.value!.id);
    items.value = d.items ?? [];
    patchListItem(detail.value!.id, { _count: { items: items.value.length } });
  } finally {
    itemsSaving.value = false;
  }
}

async function addItem() {
  if (!newItemValue.value.trim()) {
    Message.warning("请填写匹配值");
    return;
  }
  await persistItems([
    ...items.value,
    { id: "", type: newItemType.value, value: newItemValue.value, sort: items.value.length, templateId: detail.value!.id },
  ]);
  newItemValue.value = "";
}

async function removeItem(item: RuleTemplateItem) {
  await persistItems(items.value.filter((i) => i.id !== item.id));
}

function confirmDelete() {
  if (!detail.value) return;
  const t = detail.value;
  Modal.confirm({
    title: `删除「${t.name}」？`,
    content: "删除后无法恢复。",
    okText: "确认删除",
    okButtonProps: { status: "danger" },
    onOk: async () => {
      await ruleTemplateApi.remove(t.id);
      Message.success("已删除");
      await load();
    },
  });
}

function openCreate() {
  createForm.value = { name: "", description: "" };
  createVisible.value = true;
}
async function submitCreate() {
  if (!createForm.value.name.trim()) {
    Message.warning("请填写模板名称");
    return;
  }
  creating.value = true;
  try {
    const created = await ruleTemplateApi.create(createForm.value);
    createVisible.value = false;
    Message.success("已创建");
    list.value = await ruleTemplateApi.list();
    await selectTemplate(created.id);
    activeTab.value = "info";
  } finally {
    creating.value = false;
  }
}

// 导入
async function openImport() {
  if (!detail.value) return;
  importVisible.value = true;
  importLoading.value = true;
  importMode.value = "append";
  importPolicy.value = "";
  importProfileId.value = "";
  profileGroups.value = [];
  try {
    allProfiles.value = await profileApi.list();
  } finally {
    importLoading.value = false;
  }
}
async function onProfileChange(id: unknown) {
  const profileId = String(id);
  importProfileId.value = profileId;
  importPolicy.value = "";
  if (!profileId) {
    profileGroups.value = [];
    return;
  }
  const [d, groups] = await Promise.all([profileApi.get(profileId), groupApi.list()]);
  const boundIds = new Set((d.groups ?? []).map((g) => g.id));
  profileGroups.value = groups.filter((g) => boundIds.has(g.id));
}
async function doImport() {
  if (!detail.value) return;
  if (!importProfileId.value || !importPolicy.value) {
    Message.warning("请选择配置方案和去向");
    return;
  }
  importSaving.value = true;
  try {
    const r = await ruleTemplateApi.import(detail.value.id, {
      profileId: importProfileId.value,
      policy: importPolicy.value,
      mode: importMode.value,
    });
    Message.success(`已导入 ${r.imported} 条规则`);
    importVisible.value = false;
  } finally {
    importSaving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="md-shell">
    <!-- 左栏 -->
    <aside class="md-aside">
      <a-input v-model="search" placeholder="搜索模板..." allow-clear class="aside-search">
        <template #prefix><icon-search /></template>
      </a-input>
      <a-spin :loading="loading" style="display:block;flex:1;min-height:0">
        <div class="md-list">
          <div
            v-for="t in filteredList" :key="t.id"
            class="md-item" :class="{ active: t.id === selectedId }"
            @click="selectTemplate(t.id)"
          >
            <icon-storage class="pi-icon" />
            <div class="pi-main">
              <span class="pi-name">{{ t.name }}</span>
              <span class="pi-sub">{{ t._count?.items ?? 0 }} 条规则</span>
            </div>
          </div>
          <div v-if="!loading && filteredList.length === 0" class="aside-empty">
            {{ search ? "无匹配模板" : "还没有模板" }}
          </div>
        </div>
      </a-spin>
      <a-button long type="outline" class="aside-create" @click="openCreate">
        <template #icon><icon-plus /></template>新建模板
      </a-button>
    </aside>

    <!-- 右栏 -->
    <section class="md-detail">
      <div v-if="!detail" class="detail-empty">
        <icon-storage style="font-size:40px;color:#ccc;margin-bottom:12px" />
        <p>{{ loading ? "加载中..." : "选择或新建一个规则模板" }}</p>
      </div>

      <a-spin v-else :loading="detailLoading" style="display:block;width:100%">
        <div class="detail-header">
          <div class="dh-left">
            <h2 class="dh-name">{{ detail.name }}</h2>
            <p class="dh-summary">{{ items.length }} 条规则条目</p>
          </div>
          <div class="dh-right">
            <a-button type="primary" @click="openImport">
              <template #icon><icon-download /></template>导入到方案
            </a-button>
            <a-button status="danger" @click="confirmDelete">
              <template #icon><icon-delete /></template>删除
            </a-button>
          </div>
        </div>

        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <!-- 信息 -->
          <a-tab-pane key="info" title="信息">
            <a-form :model="infoForm" layout="vertical" class="tab-form">
              <a-form-item label="模板名称">
                <a-input v-model="infoForm.name" placeholder="AI规则" />
              </a-form-item>
              <a-form-item label="描述">
                <a-input v-model="infoForm.description" placeholder="OpenAI、Claude 等 AI 服务" />
              </a-form-item>
              <a-button type="primary" :loading="infoSaving" @click="saveInfo">保存</a-button>
            </a-form>
          </a-tab-pane>

          <!-- 条目 -->
          <a-tab-pane key="items" title="条目">
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
              <div v-if="items.length === 0" class="items-empty">还没有条目</div>
              <div v-for="item in items" :key="item.id" class="item-row">
                <span class="item-type">{{ item.type }}</span>
                <span class="item-value">{{ item.value }}</span>
                <a-button size="mini" status="danger" :loading="itemsSaving" @click="removeItem(item)">
                  <template #icon><icon-delete /></template>
                </a-button>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-spin>
    </section>

    <!-- 新建模板抽屉 -->
    <a-modal
      v-model:visible="createVisible"
      title="新建规则模板"
      :width="460"
      :ok-loading="creating"
      ok-text="创建"
      @ok="submitCreate"
    >
      <a-form :model="createForm" layout="vertical">
        <a-form-item label="模板名称"><a-input v-model="createForm.name" placeholder="AI规则" /></a-form-item>
        <a-form-item label="描述"><a-input v-model="createForm.description" placeholder="OpenAI、Claude 等 AI 服务" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 导入到方案 -->
    <a-modal
      v-model:visible="importVisible"
      :title="`导入「${detail?.name}」`"
      :ok-loading="importSaving"
      ok-text="导入"
      @ok="doImport"
    >
      <a-spin :loading="importLoading" style="display:block">
        <a-form :model="importForm" layout="vertical">
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
.md-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 20px;
  align-items: start;
}
.md-shell > * { box-sizing: border-box; }

/* 左栏 */
.md-aside {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 156px);
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
.pi-icon { font-size: 16px; color: var(--color-text-3); flex-shrink: 0; }
.pi-main { display: flex; flex-direction: column; min-width: 0; }
.pi-name { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pi-sub { font-size: 11px; color: var(--color-text-3); }
.aside-empty { padding: 30px 0; text-align: center; color: var(--color-text-3); font-size: 13px; }
.aside-create { flex: 0 0 auto; }

/* 右栏 */
.md-detail {
  min-width: 0;
  height: calc(100vh - 156px);
  overflow-y: auto;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: 14px;
  padding: 22px 24px;
}
.detail-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 120px 0; color: var(--color-text-3); font-size: 14px;
}
.detail-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding-bottom: 16px; border-bottom: 1px solid var(--color-border-2);
}
.dh-name { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
.dh-summary { margin: 0; font-size: 13px; color: var(--color-text-3); }
.dh-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

.detail-tabs { margin-top: 8px; }
.tab-form { max-width: 760px; }

.add-item-row { display: flex; gap: 8px; margin-bottom: 12px; max-width: 760px; }
.items-list { display: flex; flex-direction: column; gap: 4px; max-width: 760px; }
.items-empty { padding: 30px; text-align: center; color: var(--color-text-3); font-size: 13px; }
.item-row {
  display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px;
  &:hover { background: var(--color-fill-2); }
}
.item-type { font-size: 11px; font-weight: 700; color: #1668dc; background: #1668dc1a; padding: 2px 7px; border-radius: 5px; flex-shrink: 0; }
.item-value { flex: 1; font-size: 13px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

@media (max-width: 900px) {
  .md-shell { grid-template-columns: 1fr; }
  .md-aside { position: static; height: auto; max-height: 320px; }
}
</style>
