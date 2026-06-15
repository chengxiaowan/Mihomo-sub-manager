<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Message, Modal } from "@arco-design/web-vue";
import { profileApi, defaultBaseConfig, type Profile, type BaseConfig } from "@/api/profiles";
import { groupApi, type ProxyGroup } from "@/api/groups";
import { profileRuleApi, type ProfileRule } from "@/api/profile-rules";
import { useConfigStore } from "@/stores/config";

const config = useConfigStore();
const list = ref<Profile[]>([]);
const loading = ref(false);

const modalVisible = ref(false);
const editing = ref<Profile | null>(null);
const form = ref({ name: "", enabled: true, defaultPolicy: "DIRECT" });
const submitting = ref(false);

const bindVisible = ref(false);
const currentProfile = ref<Profile | null>(null);
const allGroups = ref<ProxyGroup[]>([]);
const bindGroupIds = ref<string[]>([]);
const bindSaving = ref(false);
const bindLoading = ref(false);

const ruleVisible = ref(false);
const ruleProfile = ref<Profile | null>(null);
const rules = ref<ProfileRule[]>([]);
const rulesLoading = ref(false);
const ruleForm = ref({ type: "DOMAIN-SUFFIX", value: "", policy: "" });
const ruleSubmitting = ref(false);
const editingRule = ref<ProfileRule | null>(null);
const ruleFormVisible = ref(false);

const RULE_TYPES = ["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "IP-CIDR", "IP-CIDR6", "GEOIP", "PROCESS-NAME"];
const BUILTIN_POLICIES = ["DIRECT", "REJECT", "REJECT-DROP", "PASS"];

const MODE_OPTIONS = ["rule", "global", "direct"];
const LOG_LEVEL_OPTIONS = ["silent", "error", "warning", "info", "debug"];
const ENHANCED_MODE_OPTIONS = ["fake-ip", "redir-host"];

const baseVisible = ref(false);
const baseProfile = ref<Profile | null>(null);
const baseForm = ref<BaseConfig>(defaultBaseConfig());
const baseLoading = ref(false);
const baseSaving = ref(false);

const boundGroups = computed(() =>
  allGroups.value.filter((g) => bindGroupIds.value.includes(g.id))
);

const GRAD = [
  "linear-gradient(135deg,#4080ff 0%,#7c3aed 100%)",
  "linear-gradient(135deg,#0ea5e9 0%,#059669 100%)",
  "linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)",
  "linear-gradient(135deg,#8b5cf6 0%,#ec4899 100%)",
];
function cardGrad(i: number) { return GRAD[i % GRAD.length]; }

async function load() {
  loading.value = true;
  try { list.value = await profileApi.list(); }
  finally { loading.value = false; }
}

function openCreate() {
  editing.value = null; form.value = { name: "", enabled: true, defaultPolicy: "DIRECT" }; modalVisible.value = true;
}
function openEdit(p: Profile) {
  editing.value = p; form.value = { name: p.name, enabled: p.enabled, defaultPolicy: p.defaultPolicy }; modalVisible.value = true;
}
async function submitForm() {
  if (!form.value.name.trim()) { Message.warning("请填写方案名称"); return; }
  submitting.value = true;
  try {
    editing.value ? await profileApi.update(editing.value.id, form.value) : await profileApi.create(form.value);
    Message.success(editing.value ? "已更新" : "已创建");
    modalVisible.value = false; await load();
  } finally { submitting.value = false; }
}
function confirmDelete(p: Profile) {
  Modal.confirm({
    title: `删除方案「${p.name}」？`, content: "", okText: "确认删除", okButtonProps: { status: "danger" },
    onOk: async () => { await profileApi.remove(p.id); Message.success("已删除"); await load(); },
  });
}
function regenerateToken(p: Profile) {
  Modal.confirm({
    title: "重新生成 Token？", content: "旧的订阅链接将立即失效。",
    onOk: async () => {
      const r = await profileApi.regenerateToken(p.id);
      const t = list.value.find((x) => x.id === p.id);
      if (t) t.token = r.token;
      Message.success("Token 已更新");
    },
  });
}

async function openBaseConfig(p: Profile) {
  baseProfile.value = p; baseVisible.value = true; baseLoading.value = true;
  try {
    const detail = await profileApi.get(p.id);
    baseForm.value = detail.baseConfig
      ? { ...defaultBaseConfig(), ...detail.baseConfig, dns: { ...defaultBaseConfig().dns, ...detail.baseConfig.dns } }
      : defaultBaseConfig();
  } finally { baseLoading.value = false; }
}
function resetBaseConfig() {
  baseForm.value = defaultBaseConfig();
}
async function saveBaseConfig() {
  if (!baseProfile.value) return;
  baseSaving.value = true;
  try {
    await profileApi.update(baseProfile.value.id, { baseConfig: baseForm.value });
    Message.success("基础设置已保存"); baseVisible.value = false;
  } finally { baseSaving.value = false; }
}

async function openBind(p: Profile) {
  currentProfile.value = p; bindVisible.value = true; bindLoading.value = true;
  try {
    const [detail, groups] = await Promise.all([profileApi.get(p.id), groupApi.list()]);
    allGroups.value = groups;
    bindGroupIds.value = (detail.groups ?? []).map((g) => g.id);
  } finally { bindLoading.value = false; }
}
async function saveBind() {
  if (!currentProfile.value) return;
  bindSaving.value = true;
  try {
    await profileApi.bindGroups(currentProfile.value.id, bindGroupIds.value);
    Message.success("代理组已保存"); bindVisible.value = false; await load();
  } finally { bindSaving.value = false; }
}

async function openRules(p: Profile) {
  ruleProfile.value = p; ruleVisible.value = true; rulesLoading.value = true;
  if (!allGroups.value.length) allGroups.value = await groupApi.list();
  const detail = await profileApi.get(p.id);
  bindGroupIds.value = (detail.groups ?? []).map((g) => g.id);
  try { rules.value = await profileRuleApi.list(p.id); }
  finally { rulesLoading.value = false; }
}
function openAddRule() {
  editingRule.value = null;
  ruleForm.value = { type: "DOMAIN-SUFFIX", value: "", policy: boundGroups.value[0]?.name ?? "DIRECT" };
  ruleFormVisible.value = true;
}
function openEditRule(r: ProfileRule) {
  editingRule.value = r;
  ruleForm.value = { type: r.type, value: r.value ?? "", policy: r.policy };
  ruleFormVisible.value = true;
}
async function submitRule() {
  if (!ruleForm.value.policy) { Message.warning("请选择去向"); return; }
  ruleSubmitting.value = true;
  try {
    const id = ruleProfile.value!.id;
    editingRule.value
      ? await profileRuleApi.update(id, editingRule.value.id, ruleForm.value)
      : await profileRuleApi.create(id, ruleForm.value);
    ruleFormVisible.value = false;
    rules.value = await profileRuleApi.list(id);
  } finally { ruleSubmitting.value = false; }
}
async function removeRule(r: ProfileRule) {
  await profileRuleApi.remove(ruleProfile.value!.id, r.id);
  rules.value = rules.value.filter((x) => x.id !== r.id);
}
async function toggleRule(r: ProfileRule) {
  await profileRuleApi.update(ruleProfile.value!.id, r.id, { enabled: !r.enabled });
  r.enabled = !r.enabled;
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
      <a-button type="primary" @click="openCreate">
        <template #icon><icon-plus /></template>新建方案
      </a-button>
    </div>

    <a-spin :loading="loading" style="display:block;width:100%">
      <div class="profile-grid">
        <div v-for="(p, i) in list" :key="p.id" class="profile-card">
          <div class="profile-banner" :style="{ background: cardGrad(i) }">
            <span class="profile-name">{{ p.name }}</span>
            <a-tag :color="p.enabled ? 'green' : 'gray'" size="small">{{ p.enabled ? "启用" : "禁用" }}</a-tag>
          </div>
          <div class="profile-body">
            <div class="profile-stats">
              <div class="stat-chip"><icon-layers style="color:#4080ff" /><span>{{ p._count?.groups ?? 0 }} 个代理组</span></div>
              <div class="stat-chip"><icon-filter style="color:#7c3aed" /><span>{{ p._count?.rules ?? 0 }} 条规则</span></div>
              <div class="stat-chip"><icon-swap style="color:#059669" /><span>兜底 {{ p.defaultPolicy }}</span></div>
            </div>
            <div class="url-box">
              <span class="url-text">{{ publishUrl(p.token) }}</span>
              <a-button type="primary" size="mini" @click="copyUrl(p.token)">
                <template #icon><icon-copy /></template>复制
              </a-button>
            </div>
            <div class="profile-actions">
              <a-button size="small" @click="openBind(p)"><template #icon><icon-layers /></template>绑定代理组</a-button>
              <a-button size="small" @click="openRules(p)"><template #icon><icon-filter /></template>管理规则</a-button>
              <a-button size="small" @click="openBaseConfig(p)"><template #icon><icon-settings /></template>基础设置</a-button>
              <a-button size="small" @click="openEdit(p)"><template #icon><icon-edit /></template></a-button>
              <a-button size="small" @click="regenerateToken(p)"><template #icon><icon-refresh /></template></a-button>
              <a-button size="small" status="danger" @click="confirmDelete(p)"><template #icon><icon-delete /></template></a-button>
            </div>
          </div>
        </div>
        <div v-if="!loading && list.length === 0" class="empty-card">
          <p>还没有配置方案，点击右上角新建</p>
        </div>
      </div>
    </a-spin>

    <!-- 新建/编辑 -->
    <a-modal v-model:visible="modalVisible" :title="editing ? '编辑方案' : '新建方案'" @ok="submitForm" :ok-loading="submitting">
      <a-form :model="form" layout="vertical">
        <a-form-item label="方案名称"><a-input v-model="form.name" placeholder="我的订阅" /></a-form-item>
        <a-form-item label="兜底策略（所有未匹配流量的去向）">
          <a-input v-model="form.defaultPolicy" placeholder="DIRECT" />
        </a-form-item>
        <a-form-item label="启用"><a-switch v-model="form.enabled" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 绑定代理组 -->
    <a-modal v-model:visible="bindVisible" title="绑定代理组" @ok="saveBind" :ok-loading="bindSaving" width="480px">
      <a-spin :loading="bindLoading" style="display:block">
        <div class="bind-list">
          <label
            v-for="g in allGroups" :key="g.id"
            class="bind-item" :class="{ selected: bindGroupIds.includes(g.id) }"
            @click="bindGroupIds.includes(g.id) ? bindGroupIds.splice(bindGroupIds.indexOf(g.id),1) : bindGroupIds.push(g.id)"
          >
            <span class="bind-name">{{ g.name }}</span>
            <a-tag size="small">{{ g.type }}</a-tag>
            <icon-check v-if="bindGroupIds.includes(g.id)" style="color:#4080ff;margin-left:auto" />
          </label>
          <a-empty v-if="!bindLoading && allGroups.length === 0" description="还没有代理组" />
        </div>
      </a-spin>
    </a-modal>

    <!-- 规则管理 -->
    <a-modal v-model:visible="ruleVisible" :title="`规则 — ${ruleProfile?.name}`" width="700px" :footer="false">
      <div class="rule-toolbar">
        <span class="rule-count">{{ rules.length }} 条规则 · 兜底 <b>{{ ruleProfile?.defaultPolicy }}</b></span>
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
    </a-modal>

    <!-- 添加/编辑规则 -->
    <a-modal v-model:visible="ruleFormVisible" :title="editingRule ? '编辑规则' : '添加规则'" @ok="submitRule" :ok-loading="ruleSubmitting">
      <a-form :model="ruleForm" layout="vertical">
        <a-form-item label="规则类型">
          <a-select v-model="ruleForm.type">
            <a-option v-for="t in RULE_TYPES" :key="t" :value="t">{{ t }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="匹配值">
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

    <!-- 基础设置 -->
    <a-modal
      v-model:visible="baseVisible"
      :title="`基础设置 — ${baseProfile?.name}`"
      width="640px"
      @ok="saveBaseConfig"
      :ok-loading="baseSaving"
    >
      <template #title-extra>
        <a-button size="mini" @click="resetBaseConfig">恢复默认</a-button>
      </template>
      <a-spin :loading="baseLoading" style="display:block;width:100%">
        <a-form :model="baseForm" layout="vertical">
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
        </a-form>
      </a-spin>
    </a-modal>
  </div>
</template>

<style scoped lang="less">
.page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; }
.page-title { font-size:20px; font-weight:700; margin:0 0 4px; }
.page-desc { margin:0; font-size:13px; color:var(--color-text-3); }

.profile-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(360px,1fr)); gap:20px; }
.profile-card {
  border-radius:16px; border:1px solid var(--color-border-2); overflow:hidden; background:var(--color-bg-1);
  transition:box-shadow .2s,transform .2s;
  &:hover { box-shadow:0 6px 24px rgba(0,0,0,.1); transform:translateY(-2px); }
}
.profile-banner { padding:20px; display:flex; align-items:center; justify-content:space-between; }
.profile-name { font-size:18px; font-weight:800; color:#fff; }
.profile-body { padding:18px 20px; display:flex; flex-direction:column; gap:14px; }
.profile-stats { display:flex; gap:8px; flex-wrap:wrap; }
.stat-chip {
  display:flex; align-items:center; gap:5px; font-size:12px; color:var(--color-text-2);
  background:var(--color-fill-2); padding:4px 10px; border-radius:8px;
}
.url-box {
  display:flex; align-items:center; gap:8px;
  background:var(--color-fill-2); border-radius:8px; padding:8px 12px;
}
.url-text {
  flex:1; font-size:11px; color:var(--color-text-2);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:monospace;
}
.profile-actions { display:flex; gap:8px; flex-wrap:wrap; }
.empty-card {
  grid-column:1/-1; display:flex; align-items:center; justify-content:center;
  padding:60px; border-radius:16px; border:2px dashed var(--color-border-2); color:var(--color-text-3); font-size:14px;
}

.bind-list { display:flex; flex-direction:column; gap:4px; max-height:360px; overflow-y:auto; }
.bind-item {
  display:flex; align-items:center; gap:8px; padding:8px 12px;
  border-radius:8px; cursor:pointer; border:1px solid transparent; transition:background .15s;
  &:hover { background:var(--color-fill-2); }
  &.selected { background:#eff6ff; border-color:#bfdbfe; }
}
.bind-name { flex:1; font-size:13px; }

.rule-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.rule-count { font-size:13px; color:var(--color-text-2); }
.rule-list { display:flex; flex-direction:column; gap:2px; max-height:440px; overflow-y:auto; }
.rule-empty { padding:40px; text-align:center; color:var(--color-text-3); font-size:13px; }
.rule-row {
  display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px;
  &:hover { background:var(--color-fill-2); }
  &.disabled { opacity:.5; }
}
.rule-type { font-size:11px; font-weight:700; color:#4080ff; background:#eff6ff; padding:2px 7px; border-radius:5px; flex-shrink:0; }
.rule-value { flex:1; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rule-arrow { color:var(--color-text-3); flex-shrink:0; }
.rule-policy { font-size:12px; font-weight:600; color:#059669; flex-shrink:0; min-width:60px; }
.rule-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }

.base-section-title {
  font-size:13px; font-weight:700; color:var(--color-text-2);
  margin:4px 0 12px; padding-bottom:6px; border-bottom:1px solid var(--color-border-2);
}

body:not([arco-theme="dark"]) .profile-card { background:#fff; }
body:not([arco-theme="dark"]) .bind-item.selected { background:#eff6ff; border-color:#bfdbfe; }
</style>
