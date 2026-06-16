<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Message, Modal } from "@arco-design/web-vue";
import { profileApi, defaultBaseConfig, type Profile, type BaseConfig } from "@/api/profiles";
import { groupApi, type ProxyGroup } from "@/api/groups";
import { profileRuleApi, type ProfileRule } from "@/api/profile-rules";
import { ruleProviderApi, type RuleProvider } from "@/api/rule-providers";
import { useConfigStore } from "@/stores/config";

const config = useConfigStore();

const RULE_TYPES = ["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "IP-CIDR", "IP-CIDR6", "GEOIP", "PROCESS-NAME", "RULE-SET"];
const BUILTIN_POLICIES = ["DIRECT", "REJECT", "REJECT-DROP", "PASS"];
const MODE_OPTIONS = ["rule", "global", "direct"];
const LOG_LEVEL_OPTIONS = ["silent", "error", "warning", "info", "debug"];
const ENHANCED_MODE_OPTIONS = ["fake-ip", "redir-host"];

// ── 列表（左栏） ──────────────────────────────────────────────
const list = ref<Profile[]>([]);
const loading = ref(false);
const search = ref("");
const selectedId = ref<string | null>(null);

const filteredList = computed(() => {
  const kw = search.value.trim().toLowerCase();
  return kw ? list.value.filter((p) => p.name.toLowerCase().includes(kw)) : list.value;
});

// ── 详情（右栏） ──────────────────────────────────────────────
const detail = ref<Profile | null>(null);
const detailLoading = ref(false);
const activeTab = ref("overview");

const allGroups = ref<ProxyGroup[]>([]);
const boundGroupIds = ref<string[]>([]);
const groupsSaving = ref(false);

const allProviders = ref<RuleProvider[]>([]);
const boundProviderIds = ref<string[]>([]);
const providersSaving = ref(false);
const boundProviders = computed(() =>
  allProviders.value.filter((p) => boundProviderIds.value.includes(p.id))
);

const rules = ref<ProfileRule[]>([]);
const rulesLoading = ref(false);

const overviewForm = ref({ name: "", defaultPolicy: "DIRECT" });
const overviewSaving = ref(false);

const baseForm = ref<BaseConfig>(defaultBaseConfig());
const baseSaving = ref(false);

// DNS 分流（nameserver-policy）：map ↔ 可编辑行
type NsRow = { pattern: string; servers: string[] };
const nsRows = ref<NsRow[]>([]);
function loadNsRows() {
  const map = baseForm.value.dns["nameserver-policy"] || {};
  nsRows.value = Object.entries(map).map(([pattern, servers]) => ({
    pattern,
    servers: Array.isArray(servers) ? servers : [servers as string],
  }));
}
function addNsRow() {
  nsRows.value.push({ pattern: "", servers: [] });
}
function removeNsRow(i: number) {
  nsRows.value.splice(i, 1);
}
function applyNsRows() {
  const map: Record<string, string[]> = {};
  for (const r of nsRows.value) {
    const p = r.pattern.trim();
    if (p && r.servers.length) map[p] = r.servers;
  }
  baseForm.value.dns["nameserver-policy"] = map;
}

const boundGroups = computed(() =>
  allGroups.value.filter((g) => boundGroupIds.value.includes(g.id))
);

// ── 新建方案抽屉 ──────────────────────────────────────────────
const createVisible = ref(false);
const createForm = ref({ name: "", defaultPolicy: "DIRECT", enabled: true });
const creating = ref(false);

// ── 规则抽屉 ──────────────────────────────────────────────────
const ruleDrawerVisible = ref(false);
const editingRule = ref<ProfileRule | null>(null);
const ruleForm = ref({ type: "DOMAIN-SUFFIX", value: "", policy: "" });
const ruleSubmitting = ref(false);

const validating = ref(false);
const validateResult = ref<{ errors: string[]; warnings: string[] } | null>(null);
async function runValidate() {
  if (!detail.value) return;
  validating.value = true;
  try {
    validateResult.value = await profileApi.validate(detail.value.id);
  } finally {
    validating.value = false;
  }
}

function publishUrl(token: string) {
  return `${config.serverUrl.replace(/\/$/, "")}/publish/${token}.yaml`;
}
function copyUrl(token: string) {
  navigator.clipboard.writeText(publishUrl(token));
  Message.success("订阅链接已复制");
}

async function load() {
  loading.value = true;
  try {
    list.value = await profileApi.list();
    if (!allGroups.value.length) allGroups.value = await groupApi.list();
    if (!allProviders.value.length) allProviders.value = await ruleProviderApi.list();
    if (list.value.length) {
      const stillExists = list.value.some((p) => p.id === selectedId.value);
      await selectProfile(stillExists ? selectedId.value! : list.value[0].id);
    } else {
      selectedId.value = null;
      detail.value = null;
    }
  } finally {
    loading.value = false;
  }
}

async function selectProfile(id: string) {
  selectedId.value = id;
  detailLoading.value = true;
  try {
    const d = await profileApi.get(id);
    detail.value = d;
    overviewForm.value = { name: d.name, defaultPolicy: d.defaultPolicy };
    boundGroupIds.value = (d.groups ?? []).map((g) => g.id);
    boundProviderIds.value = (d.providers ?? []).map((p) => p.id);
    validateResult.value = null;
    if (d.baseConfig) {
      const def = defaultBaseConfig();
      baseForm.value = {
        ...def,
        ...d.baseConfig,
        dns: {
          ...def.dns,
          ...d.baseConfig.dns,
          "fallback-filter": {
            ...def.dns["fallback-filter"],
            ...d.baseConfig.dns?.["fallback-filter"],
          },
        },
      };
    } else {
      baseForm.value = defaultBaseConfig();
    }
    loadNsRows();
    await loadRules(id);
  } finally {
    detailLoading.value = false;
  }
}

async function loadRules(id: string) {
  rulesLoading.value = true;
  try {
    rules.value = await profileRuleApi.list(id);
  } finally {
    rulesLoading.value = false;
  }
}

// 同步左栏列表中某方案的字段
function patchListItem(id: string, patch: Partial<Profile>) {
  const t = list.value.find((p) => p.id === id);
  if (t) Object.assign(t, patch);
}

// ── 概览 ──────────────────────────────────────────────────────
async function saveOverview() {
  if (!detail.value) return;
  if (!overviewForm.value.name.trim()) {
    Message.warning("请填写方案名称");
    return;
  }
  overviewSaving.value = true;
  try {
    const updated = await profileApi.update(detail.value.id, {
      name: overviewForm.value.name,
      defaultPolicy: overviewForm.value.defaultPolicy,
    });
    detail.value = { ...detail.value, ...updated };
    patchListItem(detail.value.id, { name: updated.name, defaultPolicy: updated.defaultPolicy });
    Message.success("已保存");
  } finally {
    overviewSaving.value = false;
  }
}

async function toggleEnable() {
  if (!detail.value) return;
  const next = !detail.value.enabled;
  await profileApi.update(detail.value.id, { enabled: next });
  detail.value.enabled = next;
  patchListItem(detail.value.id, { enabled: next });
}

function confirmDelete() {
  if (!detail.value) return;
  const p = detail.value;
  Modal.confirm({
    title: `删除方案「${p.name}」？`,
    content: "该方案的规则与绑定关系会一并删除。",
    okText: "确认删除",
    okButtonProps: { status: "danger" },
    onOk: async () => {
      await profileApi.remove(p.id);
      Message.success("已删除");
      await load();
    },
  });
}

function regenerateToken() {
  if (!detail.value) return;
  const p = detail.value;
  Modal.confirm({
    title: "重新生成 Token？",
    content: "旧的订阅链接将立即失效。",
    onOk: async () => {
      const r = await profileApi.regenerateToken(p.id);
      if (detail.value) detail.value.token = r.token;
      patchListItem(p.id, { token: r.token });
      Message.success("Token 已更新");
    },
  });
}

// ── 代理组 ────────────────────────────────────────────────────
function toggleGroup(id: string) {
  boundGroupIds.value.includes(id)
    ? (boundGroupIds.value = boundGroupIds.value.filter((v) => v !== id))
    : boundGroupIds.value.push(id);
}
async function saveGroups() {
  if (!detail.value) return;
  groupsSaving.value = true;
  try {
    await profileApi.bindGroups(detail.value.id, boundGroupIds.value);
    patchListItem(detail.value.id, {
      _count: { groups: boundGroupIds.value.length, rules: rules.value.length },
    });
    Message.success("代理组已保存");
  } finally {
    groupsSaving.value = false;
  }
}

// ── 规则集 ────────────────────────────────────────────────────
function toggleProvider(id: string) {
  boundProviderIds.value.includes(id)
    ? (boundProviderIds.value = boundProviderIds.value.filter((v) => v !== id))
    : boundProviderIds.value.push(id);
}
async function saveProviders() {
  if (!detail.value) return;
  providersSaving.value = true;
  try {
    await profileApi.bindProviders(detail.value.id, boundProviderIds.value);
    if (detail.value) {
      detail.value.providers = boundProviders.value.map((p) => ({ id: p.id, name: p.name }));
    }
    Message.success("规则集已保存");
  } finally {
    providersSaving.value = false;
  }
}

// ── 规则 ──────────────────────────────────────────────────────
function openAddRule() {
  editingRule.value = null;
  ruleForm.value = { type: "DOMAIN-SUFFIX", value: "", policy: boundGroups.value[0]?.name ?? "DIRECT" };
  ruleDrawerVisible.value = true;
}
function openEditRule(r: ProfileRule) {
  editingRule.value = r;
  ruleForm.value = { type: r.type, value: r.value ?? "", policy: r.policy };
  ruleDrawerVisible.value = true;
}
async function submitRule() {
  if (!detail.value) return;
  if (!ruleForm.value.policy) {
    Message.warning("请选择去向");
    return;
  }
  ruleSubmitting.value = true;
  try {
    const id = detail.value.id;
    editingRule.value
      ? await profileRuleApi.update(id, editingRule.value.id, ruleForm.value)
      : await profileRuleApi.create(id, ruleForm.value);
    ruleDrawerVisible.value = false;
    await loadRules(id);
    patchListItem(id, { _count: { groups: boundGroupIds.value.length, rules: rules.value.length } });
  } finally {
    ruleSubmitting.value = false;
  }
}
async function removeRule(r: ProfileRule) {
  if (!detail.value) return;
  await profileRuleApi.remove(detail.value.id, r.id);
  rules.value = rules.value.filter((x) => x.id !== r.id);
  patchListItem(detail.value.id, { _count: { groups: boundGroupIds.value.length, rules: rules.value.length } });
}
async function toggleRule(r: ProfileRule) {
  if (!detail.value) return;
  await profileRuleApi.update(detail.value.id, r.id, { enabled: !r.enabled });
  r.enabled = !r.enabled;
}

// ── 基础设置 ──────────────────────────────────────────────────
function resetBaseConfig() {
  baseForm.value = defaultBaseConfig();
  loadNsRows();
}
async function saveBaseConfig() {
  if (!detail.value) return;
  applyNsRows();
  baseSaving.value = true;
  try {
    await profileApi.update(detail.value.id, { baseConfig: baseForm.value });
    Message.success("基础设置已保存");
  } finally {
    baseSaving.value = false;
  }
}

// ── 新建方案 ──────────────────────────────────────────────────
function openCreate() {
  createForm.value = { name: "", defaultPolicy: "DIRECT", enabled: true };
  createVisible.value = true;
}
async function submitCreate() {
  if (!createForm.value.name.trim()) {
    Message.warning("请填写方案名称");
    return;
  }
  creating.value = true;
  try {
    const created = await profileApi.create(createForm.value);
    createVisible.value = false;
    Message.success("已创建");
    list.value = await profileApi.list();
    await selectProfile(created.id);
    activeTab.value = "overview";
  } finally {
    creating.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="profiles-shell">
    <!-- 左栏：方案列表 -->
    <aside class="profile-aside">
      <a-input v-model="search" placeholder="搜索方案..." allow-clear class="aside-search">
        <template #prefix><icon-search /></template>
      </a-input>
      <a-spin :loading="loading" style="display:block;flex:1;min-height:0">
        <div class="profile-list">
          <div
            v-for="p in filteredList" :key="p.id"
            class="profile-item" :class="{ active: p.id === selectedId }"
            @click="selectProfile(p.id)"
          >
            <span class="pi-dot" :style="{ background: p.enabled ? '#10b981' : '#9ca3af' }" />
            <div class="pi-main">
              <span class="pi-name">{{ p.name }}</span>
              <span class="pi-sub">{{ p._count?.groups ?? 0 }}组 · {{ p._count?.rules ?? 0 }}规则</span>
            </div>
          </div>
          <div v-if="!loading && filteredList.length === 0" class="aside-empty">
            {{ search ? "无匹配方案" : "还没有方案" }}
          </div>
        </div>
      </a-spin>
      <a-button long type="outline" class="aside-create" @click="openCreate">
        <template #icon><icon-plus /></template>新建方案
      </a-button>
    </aside>

    <!-- 右栏：方案详情 -->
    <section class="profile-detail">
      <div v-if="!detail" class="detail-empty">
        <icon-file style="font-size:40px;color:#ccc;margin-bottom:12px" />
        <p>{{ loading ? "加载中..." : "选择或新建一个方案" }}</p>
      </div>

      <a-spin v-else :loading="detailLoading" style="display:block;width:100%">
        <!-- header -->
        <div class="detail-header">
          <div class="dh-left">
            <h2 class="dh-name">{{ detail.name }}</h2>
            <p class="dh-summary">
              {{ boundGroupIds.length }} 代理组 · {{ rules.length }} 规则 · 兜底 {{ detail.defaultPolicy }}
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
              <a-form-item label="方案名称">
                <a-input v-model="overviewForm.name" placeholder="我的订阅" />
              </a-form-item>
              <a-form-item label="兜底策略（所有未匹配流量的去向）">
                <a-input v-model="overviewForm.defaultPolicy" placeholder="DIRECT" />
              </a-form-item>
              <a-button type="primary" :loading="overviewSaving" @click="saveOverview">保存</a-button>
            </a-form>
          </a-tab-pane>

          <!-- 代理组 -->
          <a-tab-pane key="groups" title="代理组">
            <div class="tab-toolbar">
              <span class="tab-hint">已绑定 {{ boundGroupIds.length }} / {{ allGroups.length }} 个代理组</span>
              <a-button type="primary" :loading="groupsSaving" @click="saveGroups">保存绑定</a-button>
            </div>
            <div class="bind-list">
              <label
                v-for="g in allGroups" :key="g.id"
                class="bind-item" :class="{ selected: boundGroupIds.includes(g.id) }"
                @click="toggleGroup(g.id)"
              >
                <span class="bind-name">{{ g.name }}</span>
                <a-tag size="small">{{ g.type }}</a-tag>
                <icon-check v-if="boundGroupIds.includes(g.id)" style="color:#1668dc;margin-left:auto" />
              </label>
              <a-empty v-if="allGroups.length === 0" description="还没有代理组" />
            </div>
          </a-tab-pane>

          <!-- 规则集 -->
          <a-tab-pane key="providers" title="规则集">
            <div class="tab-toolbar">
              <span class="tab-hint">已绑定 {{ boundProviderIds.length }} / {{ allProviders.length }} 个规则集</span>
              <a-button type="primary" :loading="providersSaving" @click="saveProviders">保存绑定</a-button>
            </div>
            <p class="tab-hint" style="margin-bottom:12px">
              绑定后即可在「规则」里用 <code>RULE-SET</code> 类型引用这些规则集。
            </p>
            <div class="bind-list">
              <label
                v-for="p in allProviders" :key="p.id"
                class="bind-item" :class="{ selected: boundProviderIds.includes(p.id) }"
                @click="toggleProvider(p.id)"
              >
                <span class="bind-name">{{ p.name }}</span>
                <a-tag size="small">{{ p.type }}</a-tag>
                <a-tag size="small" color="arcoblue">{{ p.behavior }}</a-tag>
                <icon-check v-if="boundProviderIds.includes(p.id)" style="color:#1668dc;margin-left:auto" />
              </label>
              <a-empty v-if="allProviders.length === 0" description="还没有规则集，去「规则集」菜单创建" />
            </div>
          </a-tab-pane>

          <!-- 规则 -->
          <a-tab-pane key="rules" title="规则">
            <div class="tab-toolbar">
              <span class="tab-hint">{{ rules.length }} 条规则 · 兜底 <b>{{ detail.defaultPolicy }}</b></span>
              <a-button type="primary" size="small" @click="openAddRule">
                <template #icon><icon-plus /></template>添加规则
              </a-button>
            </div>
            <a-spin :loading="rulesLoading" style="display:block">
              <div class="rule-list">
                <div v-if="!rulesLoading && rules.length === 0" class="rule-empty">
                  还没有规则，点击「添加规则」或从规则市场导入
                </div>
                <div v-for="r in rules" :key="r.id" class="rule-row" :class="{ disabled: !r.enabled }">
                  <span class="rule-type">{{ r.type }}</span>
                  <span class="rule-value">{{ r.value || "—" }}</span>
                  <span class="rule-arrow">→</span>
                  <span class="rule-policy">{{ r.policy }}</span>
                  <div class="rule-actions">
                    <a-switch :model-value="r.enabled" size="small" @change="toggleRule(r)" />
                    <a-button size="mini" @click="openEditRule(r)"><template #icon><icon-edit /></template></a-button>
                    <a-button size="mini" status="danger" @click="removeRule(r)"><template #icon><icon-delete /></template></a-button>
                  </div>
                </div>
              </div>
            </a-spin>
          </a-tab-pane>

          <!-- 基础设置 -->
          <a-tab-pane key="base" title="基础设置">
            <div class="tab-toolbar">
              <span class="tab-hint">Mihomo 通用配置（general + dns）</span>
              <div style="display:flex;gap:8px">
                <a-button size="small" @click="resetBaseConfig">恢复默认</a-button>
                <a-button type="primary" size="small" :loading="baseSaving" @click="saveBaseConfig">保存</a-button>
              </div>
            </div>
            <a-form :model="baseForm" layout="vertical" class="tab-form">
              <div class="base-section-title">通用</div>
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="混合端口 (mixed-port)">
                    <a-input-number v-model="baseForm['mixed-port']" :min="1" :max="65535" style="width:100%" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="外部控制器 (external-controller)">
                    <a-input v-model="baseForm['external-controller']" placeholder="127.0.0.1:9090" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="运行模式 (mode)">
                    <a-select v-model="baseForm.mode">
                      <a-option v-for="m in MODE_OPTIONS" :key="m" :value="m">{{ m }}</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="日志级别 (log-level)">
                    <a-select v-model="baseForm['log-level']">
                      <a-option v-for="l in LOG_LEVEL_OPTIONS" :key="l" :value="l">{{ l }}</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="监听地址 (bind-address)">
                    <a-input v-model="baseForm['bind-address']" placeholder="*" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="允许局域网 (allow-lan)">
                    <a-switch v-model="baseForm['allow-lan']" />
                  </a-form-item>
                </a-col>
              </a-row>

              <div class="base-section-title">DNS</div>
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="启用 (enable)"><a-switch v-model="baseForm.dns.enable" /></a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="IPv6"><a-switch v-model="baseForm.dns.ipv6" /></a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="使用 hosts (use-hosts)"><a-switch v-model="baseForm.dns['use-hosts']" /></a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="增强模式 (enhanced-mode)">
                    <a-select v-model="baseForm.dns['enhanced-mode']">
                      <a-option v-for="e in ENHANCED_MODE_OPTIONS" :key="e" :value="e">{{ e }}</a-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="Fake-IP 网段 (fake-ip-range)">
                    <a-input v-model="baseForm.dns['fake-ip-range']" placeholder="198.18.0.1/16" />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="默认 DNS (default-nameserver)">
                <a-input-tag v-model="baseForm.dns['default-nameserver']" placeholder="回车添加，纯 IP" allow-clear />
              </a-form-item>
              <a-form-item label="DNS 服务器 (nameserver)">
                <a-input-tag v-model="baseForm.dns.nameserver" placeholder="回车添加，支持 DoH" allow-clear />
              </a-form-item>
              <a-form-item label="代理节点 DNS (proxy-server-nameserver)">
                <a-input-tag v-model="baseForm.dns['proxy-server-nameserver']" placeholder="回车添加，支持 DoH" allow-clear />
              </a-form-item>
              <a-form-item label="Fake-IP 排除 (fake-ip-filter)">
                <a-input-tag v-model="baseForm.dns['fake-ip-filter']" placeholder="回车添加，支持通配，如 *.lan" allow-clear />
              </a-form-item>
              <a-form-item label="回退 DNS (fallback)">
                <a-input-tag v-model="baseForm.dns.fallback" placeholder="回车添加，国外 DNS，支持 DoH" allow-clear />
              </a-form-item>

              <div class="base-section-title">回退过滤 (fallback-filter)</div>
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="按 GeoIP (geoip)"><a-switch v-model="baseForm.dns['fallback-filter'].geoip" /></a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="GeoIP 代码 (geoip-code)">
                    <a-input v-model="baseForm.dns['fallback-filter']['geoip-code']" placeholder="CN" />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="GeoSite (geosite)">
                <a-input-tag v-model="baseForm.dns['fallback-filter'].geosite" placeholder="回车添加，如 gfw" allow-clear />
              </a-form-item>
              <a-form-item label="IP 网段 (ipcidr)">
                <a-input-tag v-model="baseForm.dns['fallback-filter'].ipcidr" placeholder="回车添加，如 240.0.0.0/4" allow-clear />
              </a-form-item>
              <a-form-item label="域名 (domain)">
                <a-input-tag v-model="baseForm.dns['fallback-filter'].domain" placeholder="回车添加，如 +.google.com" allow-clear />
              </a-form-item>

              <div class="base-section-title">DNS 分流 (nameserver-policy)</div>
              <p class="tab-hint" style="margin-bottom:12px">
                按「域名 / geosite 分类」精确指定用哪组 DNS 解析；命中规则的域名直接走对应 DNS，不再经污染判断。
              </p>
              <div v-for="(row, i) in nsRows" :key="i" class="ns-row">
                <a-input v-model="row.pattern" class="ns-pattern" placeholder="geosite:cn 或 +.example.com" allow-clear />
                <a-input-tag v-model="row.servers" class="ns-servers" placeholder="回车添加 DNS，支持 DoH" allow-clear />
                <a-button class="ns-del" status="danger" @click="removeNsRow(i)">
                  <template #icon><icon-delete /></template>
                </a-button>
              </div>
              <a-button type="outline" size="small" @click="addNsRow">
                <template #icon><icon-plus /></template>添加分流规则
              </a-button>
            </a-form>
          </a-tab-pane>

          <!-- 发布 -->
          <a-tab-pane key="publish" title="发布">
            <div class="tab-form">
              <div class="publish-label">订阅链接</div>
              <div class="url-box">
                <span class="url-text">{{ publishUrl(detail.token) }}</span>
                <a-button type="primary" size="small" @click="copyUrl(detail.token)">
                  <template #icon><icon-copy /></template>复制
                </a-button>
              </div>
              <p class="publish-tip">在 Mihomo 客户端中导入此链接即可使用。</p>
              <a-space>
                <a-button :loading="validating" @click="runValidate">
                  <template #icon><icon-check-circle /></template>校验配置
                </a-button>
                <a-button @click="regenerateToken">
                  <template #icon><icon-refresh /></template>重新生成 Token
                </a-button>
              </a-space>

              <div v-if="validateResult" class="validate-box">
                <a-alert
                  v-if="validateResult.errors.length === 0 && validateResult.warnings.length === 0"
                  type="success"
                >
                  校验通过，可正常发布。
                </a-alert>
                <a-alert v-if="validateResult.errors.length" type="error" style="margin-bottom:8px">
                  <template #title>{{ validateResult.errors.length }} 个错误（会导致发布失败）</template>
                  <ul class="validate-list">
                    <li v-for="(e, i) in validateResult.errors" :key="i">{{ e }}</li>
                  </ul>
                </a-alert>
                <a-alert v-if="validateResult.warnings.length" type="warning">
                  <template #title>{{ validateResult.warnings.length }} 个告警（不阻断发布）</template>
                  <ul class="validate-list">
                    <li v-for="(w, i) in validateResult.warnings" :key="i">{{ w }}</li>
                  </ul>
                </a-alert>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-spin>
    </section>

    <!-- 新建方案抽屉 -->
    <a-modal
      v-model:visible="createVisible"
      title="新建方案"
      :width="460"
      :ok-loading="creating"
      ok-text="创建"
      @ok="submitCreate"
    >
      <a-form :model="createForm" layout="vertical">
        <a-form-item label="方案名称"><a-input v-model="createForm.name" placeholder="我的订阅" /></a-form-item>
        <a-form-item label="兜底策略"><a-input v-model="createForm.defaultPolicy" placeholder="DIRECT" /></a-form-item>
        <a-form-item label="启用"><a-switch v-model="createForm.enabled" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 规则抽屉 -->
    <a-modal
      v-model:visible="ruleDrawerVisible"
      :title="editingRule ? '编辑规则' : '添加规则'"
      :width="460"
      :ok-loading="ruleSubmitting"
      ok-text="保存"
      @ok="submitRule"
    >
      <a-form :model="ruleForm" layout="vertical">
        <a-form-item label="规则类型">
          <a-select v-model="ruleForm.type">
            <a-option v-for="t in RULE_TYPES" :key="t" :value="t">{{ t }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="ruleForm.type === 'RULE-SET'" label="规则集">
          <a-select v-model="ruleForm.value" allow-search placeholder="选择已绑定的规则集">
            <a-option v-for="p in boundProviders" :key="p.id" :value="p.name">{{ p.name }}</a-option>
          </a-select>
          <template v-if="boundProviders.length === 0">
            <p class="tab-hint" style="margin-top:6px">先在「规则集」标签页绑定规则集。</p>
          </template>
        </a-form-item>
        <a-form-item v-else label="匹配值">
          <a-input v-model="ruleForm.value" placeholder="openai.com" />
        </a-form-item>
        <a-form-item label="去向">
          <a-select v-model="ruleForm.policy" allow-search>
            <a-optgroup label="内置策略">
              <a-option v-for="p in BUILTIN_POLICIES" :key="p" :value="p">{{ p }}</a-option>
            </a-optgroup>
            <a-optgroup label="代理组">
              <a-option v-for="g in boundGroups" :key="g.id" :value="g.name">{{ g.name }}</a-option>
            </a-optgroup>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.profiles-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 20px;
  align-items: start;
}

/* 左栏 */
.profile-aside {
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
.profile-list { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
.profile-item {
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
.profile-detail {
  min-width: 0; /* 允许 1fr 列收缩，内容溢出时内部处理而非撑出横向滚动条 */
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
.dh-name { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
.dh-summary { margin: 0; font-size: 13px; color: var(--color-text-3); }
.dh-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

.detail-tabs { margin-top: 8px; }
.tab-form { max-width: 760px; }

.tab-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.tab-hint { font-size: 13px; color: var(--color-text-2); }

.base-section-title {
  font-size: 13px; font-weight: 700; color: var(--color-text-2);
  margin: 4px 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--color-border-2);
}

/* 绑定代理组 */
.bind-list { display: flex; flex-direction: column; gap: 4px; max-width: 560px; }
.bind-item {
  display: flex; align-items: center; gap: 8px; padding: 9px 12px;
  border-radius: 8px; cursor: pointer; border: 1px solid transparent; transition: background .15s;
  &:hover { background: var(--color-fill-2); }
  &.selected { background: var(--color-fill-2); border-color: var(--color-border-2); }
}
.bind-name { font-size: 13px; }

/* 规则 */
.rule-list { display: flex; flex-direction: column; gap: 2px; max-width: 760px; }
.rule-empty { padding: 40px; text-align: center; color: var(--color-text-3); font-size: 13px; }
.rule-row {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px;
  &:hover { background: var(--color-fill-2); }
  &.disabled { opacity: .5; }
}
.rule-type { font-size: 11px; font-weight: 700; color: #1668dc; background: #1668dc1a; padding: 2px 7px; border-radius: 5px; flex-shrink: 0; }
.rule-value { flex: 1; font-size: 13px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rule-arrow { color: var(--color-text-3); flex-shrink: 0; }
.rule-policy { font-size: 12px; font-weight: 600; color: #0fad9b; flex-shrink: 0; min-width: 60px; }
.rule-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

/* 发布 */
.publish-label { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.url-box {
  display: flex; align-items: center; gap: 8px;
  background: var(--color-fill-2); border-radius: 8px; padding: 10px 12px; max-width: 760px;
}
.url-text {
  flex: 1; font-size: 12px; color: var(--color-text-2);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.publish-tip { font-size: 12px; color: var(--color-text-3); margin: 10px 0 18px; }
.validate-box { margin-top: 16px; }
.validate-list { margin: 4px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.7; }

/* DNS 分流行 */
.ns-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
.ns-pattern { width: 240px; flex: 0 0 240px; }
.ns-servers { flex: 1; min-width: 0; }
.ns-del { flex: 0 0 auto; }

@media (max-width: 900px) {
  .profiles-shell { grid-template-columns: 1fr; }
  .profile-aside { position: static; height: auto; max-height: 320px; }
}
</style>
