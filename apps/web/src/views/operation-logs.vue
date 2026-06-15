<script setup lang="ts">
import { ref, onMounted } from "vue";
import { operationLogApi, type OperationLog } from "@/api/operation-logs";

const list = ref<OperationLog[]>([]);
const loading = ref(false);

const STATUS: Record<string, { label: string; color: string }> = {
  success: { label: "成功", color: "#10b981" },
  error: { label: "失败", color: "#ef4444" },
  info: { label: "信息", color: "#3b82f6" },
};

function fmtTime(t: string) {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fmtDetail(detail: Record<string, unknown> | null) {
  if (!detail || Object.keys(detail).length === 0) return "";
  return JSON.stringify(detail);
}

async function load() {
  loading.value = true;
  try {
    list.value = await operationLogApi.list(200);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h2 class="page-title">操作日志</h2>
        <p class="page-desc">系统操作与订阅拉取记录（最近 200 条）</p>
      </div>
      <a-button :loading="loading" @click="load">
        <template #icon><icon-refresh /></template>刷新
      </a-button>
    </div>

    <a-spin :loading="loading" style="display:block;width:100%">
      <a-table
        :data="list"
        :pagination="{ pageSize: 20, showTotal: true }"
        :bordered="false"
        row-key="id"
      >
        <template #columns>
          <a-table-column title="时间" :width="180">
            <template #cell="{ record }">
              <span class="log-time">{{ fmtTime(record.createdAt) }}</span>
            </template>
          </a-table-column>
          <a-table-column title="状态" :width="90">
            <template #cell="{ record }">
              <span
                class="log-status"
                :style="{ color: STATUS[record.status]?.color ?? '#999' }"
              >
                <span
                  class="status-dot"
                  :style="{ background: STATUS[record.status]?.color ?? '#999' }"
                ></span>
                {{ STATUS[record.status]?.label ?? record.status }}
              </span>
            </template>
          </a-table-column>
          <a-table-column title="动作" :width="200" data-index="action" />
          <a-table-column title="说明">
            <template #cell="{ record }">
              <div class="log-msg">{{ record.message ?? "—" }}</div>
              <div v-if="fmtDetail(record.detail)" class="log-detail">
                {{ fmtDetail(record.detail) }}
              </div>
            </template>
          </a-table-column>
        </template>

        <template #empty>
          <div class="log-empty">
            <icon-file style="font-size:36px;color:#ccc;margin-bottom:12px" />
            <p>暂无操作日志</p>
          </div>
        </template>
      </a-table>
    </a-spin>
  </div>
</template>

<style scoped lang="less">
.page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; }
.page-title { font-size:20px; font-weight:700; margin:0 0 4px; }
.page-desc { margin:0; font-size:13px; color:var(--color-text-3); }

.log-time { font-size:13px; color:var(--color-text-2); font-variant-numeric: tabular-nums; }

.log-status { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:600; }
.status-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

.log-msg { font-size:13px; color:var(--color-text-1); }
.log-detail {
  margin-top:4px;
  font-size:12px;
  color:var(--color-text-3);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}

.log-empty {
  display:flex; flex-direction:column; align-items:center;
  padding:60px 0; color:var(--color-text-3); font-size:14px;
}
</style>
