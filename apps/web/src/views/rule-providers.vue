<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Message, Modal } from "@arco-design/web-vue";
import { ruleProviderApi, type RuleProvider, type RuleProviderInput } from "@/api/rule-providers";

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  http:   { label: "远程", color: "#1677ff", bg: "#e6f4ff" },
  inline: { label: "内联", color: "#722ed1", bg: "#f9f0ff" },
};
function typeConf(type: string) {
  return TYPE_CONFIG[type] ?? { label: type, color: "#595959", bg: "#f5f5f5" };
}
const BEHAVIOR_OPTIONS = ["domain", "ipcidr", "classical"];
const FORMAT_OPTIONS = [
  { value: "yaml", label: "yaml（payload 列表）" },
  { value: "text", label: "text（.txt/.list 纯文本，每行一条）" },
  { value: "mrs", label: "mrs（二进制，仅 domain/ipcidr）" },
];

// ── 列表 ──────────────────────────────────────────────
const list = ref<RuleProvider[]>([]);
const loading = ref(false);
const search = ref("");
const selectedId = ref<string | null>(null);

const filteredList = computed(() => {
  const kw = search.value.trim().toLowerCase();
  return kw ? list.value.filter((p) => p.name.toLowerCase().includes(kw)) : list.value;
});

// ── 详情 ──────────────────────────────────────────────
const detail = ref<RuleProvider | null>(null);
const detailLoading = ref(false);
const saving = ref(false);

type Form = {
  name: string;
  type: string;
  behavior: string;
  format: string;
  url: string;
  path: string;
  interval?: number;
  proxy: string;
  payload: string[];
};
const form = ref<Form>(blankForm());
function blankForm(): Form {
  return {
    name: "",
    type: "http",
    behavior: "domain",
    format: "yaml",
    url: "",
    path: "",
    interval: 86400,
    proxy: "",
    payload: [],
  };
}

function patchListItem(id: string, patch: Partial<RuleProvider>) {
  const t = list.value.find((p) => p.id === id);
  if (t) Object.assign(t, patch);
}

async function load() {
  loading.value = true;
  try {
    list.value = await ruleProviderApi.list();
    if (list.value.length) {
      const stillExists = list.value.some((p) => p.id === selectedId.value);
      await select(stillExists ? selectedId.value! : list.value[0].id);
    } else {
      selectedId.value = null;
      detail.value = null;
    }
  } finally {
    loading.value = false;
  }
}

async function select(id: string) {
  selectedId.value = id;
  detailLoading.value = true;
  try {
    const d = await ruleProviderApi.get(id);
    detail.value = d;
    form.value = {
      name: d.name,
      type: d.type,
      behavior: d.behavior,
      format: d.format,
      url: d.url ?? "",
      path: d.path ?? "",
      interval: d.interval ?? undefined,
      proxy: d.proxy ?? "",
      payload: d.payload ?? [],
    };
  } finally {
    detailLoading.value = false;
  }
}

async function save() {
  if (!detail.value) return;
  const f = form.value;
  if (!f.name.trim()) return Message.warning("请填写引用名");
  if (f.type === "http" && !f.url.trim()) return Message.warning("远程规则集必须填写 URL");
  saving.value = true;
  try {
    const payload: RuleProviderInput = {
      name: f.name,
      type: f.type,
      behavior: f.behavior,
      format: f.format,
      url: f.url,
      path: f.path,
      proxy: f.proxy,
      payload: f.payload,
    };
    if (f.interval != null) payload.interval = f.interval;
    const updated = await ruleProviderApi.update(detail.value.id, payload);
    detail.value = updated;
    patchListItem(updated.id, { name: updated.name, type: updated.type });
    Message.success("已保存");
  } finally {
    saving.value = false;
  }
}

async function toggleEnable() {
  if (!detail.value) return;
  const next = !detail.value.enabled;
  await ruleProviderApi.update(detail.value.id, { enabled: next });
  detail.value.enabled = next;
  patchListItem(detail.value.id, { enabled: next });
}

function confirmDelete() {
  if (!detail.value) return;
  const p = detail.value;
  Modal.confirm({
    title: `删除规则集「${p.name}」？`,
    content: "若已被配置方案绑定，删除后该引用将失效。",
    okText: "确认删除",
    okButtonProps: { status: "danger" },
    onOk: async () => {
      await ruleProviderApi.remove(p.id);
      Message.success("已删除");
      await load();
    },
  });
}

// ── 新建 ──────────────────────────────────────────────
const createVisible = ref(false);
const createForm = ref<Form>(blankForm());
const creating = ref(false);

function openCreate() {
  createForm.value = blankForm();
  createVisible.value = true;
}
async function submitCreate() {
  const f = createForm.value;
  if (!f.name.trim()) return Message.warning("请填写引用名");
  if (f.type === "http" && !f.url.trim()) return Message.warning("远程规则集必须填写 URL");
  creating.value = true;
  try {
    const data = {
      name: f.name,
      type: f.type,
      behavior: f.behavior,
      format: f.format,
      url: f.url,
      path: f.path,
      proxy: f.proxy,
      payload: f.payload,
      ...(f.interval != null ? { interval: f.interval } : {}),
    };
    const created = await ruleProviderApi.create(data);
    createVisible.value = false;
    Message.success("已创建");
    list.value = await ruleProviderApi.list();
    await select(created.id);
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
      <a-input v-model="search" placeholder="搜索规则集..." allow-clear class="aside-search">
        <template #prefix><icon-search /></template>
      </a-input>
      <a-spin :loading="loading" style="display:block;flex:1;min-height:0">
        <div class="md-list">
          <div
            v-for="p in filteredList" :key="p.id"
            class="md-item" :class="{ active: p.id === selectedId }"
            @click="select(p.id)"
          >
            <span class="pi-dot" :style="{ background: typeConf(p.type).color }" />
            <div class="pi-main">
              <span class="pi-name">{{ p.name }}</span>
              <span class="pi-sub">{{ typeConf(p.type).label }} · {{ p.behavior }}</span>
            </div>
          </div>
          <div v-if="!loading && filteredList.length === 0" class="aside-empty">
            {{ search ? "无匹配规则集" : "还没有规则集" }}
          </div>
        </div>
      </a-spin>
      <a-button long type="outline" class="aside-create" @click="openCreate">
        <template #icon><icon-plus /></template>新建规则集
      </a-button>
    </aside>

    <!-- 右栏 -->
    <section class="md-detail">
      <div v-if="!detail" class="detail-empty">
        <icon-bookmark style="font-size:40px;color:#ccc;margin-bottom:12px" />
        <p>{{ loading ? "加载中..." : "选择或新建一个规则集" }}</p>
      </div>

      <a-spin v-else :loading="detailLoading" style="display:block;width:100%">
        <div class="detail-header">
          <div class="dh-left">
            <h2 class="dh-name">{{ detail.name }}</h2>
            <p class="dh-summary">
              <span class="type-chip" :style="{ color: typeConf(detail.type).color, background: typeConf(detail.type).bg }">
                {{ typeConf(detail.type).label }}
              </span>
              在规则里以 <code>RULE-SET,{{ detail.name }},&lt;去向&gt;</code> 引用
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

        <a-form :model="form" layout="vertical" class="tab-form" style="margin-top:16px">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="引用名 (name)">
                <a-input v-model="form.name" placeholder="如 ads / cn-domain" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="类型 (type)">
                <a-select v-model="form.type">
                  <a-option v-for="(c, key) in TYPE_CONFIG" :key="key" :value="key">{{ c.label }}（{{ key }}）</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="行为 (behavior)">
                <a-select v-model="form.behavior">
                  <a-option v-for="b in BEHAVIOR_OPTIONS" :key="b" :value="b">{{ b }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col v-if="form.type !== 'inline'" :span="12">
              <a-form-item label="格式 (format)">
                <a-select v-model="form.format">
                  <a-option v-for="f in FORMAT_OPTIONS" :key="f.value" :value="f.value">{{ f.label }}</a-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item v-if="form.type === 'http'" label="URL（必填）">
            <a-input v-model="form.url" placeholder="https://.../ruleset.yaml" allow-clear />
          </a-form-item>
          <a-row v-if="form.type === 'http'" :gutter="16">
            <a-col :span="8">
              <a-form-item label="更新间隔 (interval，秒)">
                <a-input-number v-model="form.interval" :min="1" placeholder="86400" style="width:100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="下载代理 (proxy)">
                <a-input v-model="form.proxy" placeholder="代理组名，留空直连" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="缓存路径 (path)">
                <a-input v-model="form.path" placeholder="留空自动生成" allow-clear />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item v-if="form.type === 'inline'" label="规则条目 (payload)">
            <a-input-tag v-model="form.payload" placeholder="回车添加，如 +.example.com 或 DOMAIN-SUFFIX,example.com" allow-clear />
          </a-form-item>

          <a-button type="primary" :loading="saving" @click="save">保存</a-button>
        </a-form>
      </a-spin>
    </section>

    <!-- 新建弹窗 -->
    <a-modal
      v-model:visible="createVisible"
      title="新建规则集"
      :width="520"
      :ok-loading="creating"
      ok-text="创建"
      @ok="submitCreate"
    >
      <a-form :model="createForm" layout="vertical">
        <a-form-item label="引用名"><a-input v-model="createForm.name" placeholder="如 ads" /></a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="类型">
              <a-select v-model="createForm.type">
                <a-option v-for="(c, key) in TYPE_CONFIG" :key="key" :value="key">{{ c.label }}（{{ key }}）</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="行为">
              <a-select v-model="createForm.behavior">
                <a-option v-for="b in BEHAVIOR_OPTIONS" :key="b" :value="b">{{ b }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item v-if="createForm.type === 'http'" label="URL">
          <a-input v-model="createForm.url" placeholder="https://.../ruleset.txt" />
        </a-form-item>
        <a-form-item v-if="createForm.type === 'http'" label="格式 (format)">
          <a-select v-model="createForm.format">
            <a-option v-for="f in FORMAT_OPTIONS" :key="f.value" :value="f.value">{{ f.label }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="createForm.type === 'inline'" label="规则条目">
          <a-input-tag v-model="createForm.payload" placeholder="回车添加" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.md-shell { display: grid; grid-template-columns: 260px 1fr; gap: 20px; align-items: start; }
.md-shell > * { box-sizing: border-box; }

.md-aside {
  position: sticky; top: 0; display: flex; flex-direction: column; gap: 12px;
  height: calc(100vh - 156px); background: var(--color-bg-1);
  border: 1px solid var(--color-border-2); border-radius: 14px; padding: 14px;
}
.aside-search { flex: 0 0 auto; }
.md-list { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
.md-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 9px;
  cursor: pointer; border: 1px solid transparent; transition: background .15s;
  &:hover { background: var(--color-fill-2); }
  &.active { background: var(--color-fill-2); border-color: var(--color-border-2); }
}
.pi-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.pi-main { display: flex; flex-direction: column; min-width: 0; }
.pi-name { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pi-sub { font-size: 11px; color: var(--color-text-3); }
.aside-empty { padding: 30px 0; text-align: center; color: var(--color-text-3); font-size: 13px; }
.aside-create { flex: 0 0 auto; }

.md-detail {
  min-width: 0;
  height: calc(100vh - 156px);
  overflow-y: auto;
  background: var(--color-bg-1); border: 1px solid var(--color-border-2);
  border-radius: 14px; padding: 22px 24px;
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
.dh-summary { margin: 0; font-size: 13px; color: var(--color-text-3); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dh-summary code { background: var(--color-fill-2); padding: 1px 6px; border-radius: 5px; font-size: 12px; }
.type-chip { font-size: 12px; font-weight: 600; padding: 2px 9px; border-radius: 20px; }
.dh-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.tab-form { max-width: 760px; }

@media (max-width: 900px) {
  .md-shell { grid-template-columns: 1fr; }
  .md-aside { position: static; height: auto; max-height: 320px; }
}
</style>
