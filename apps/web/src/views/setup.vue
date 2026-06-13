<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useConfigStore } from "@/stores/config";
import { checkHealth } from "@/api/health";
import { Message } from "@arco-design/web-vue";

const router = useRouter();
const config = useConfigStore();

const form = ref({ serverUrl: "", apiKey: "" });
const loading = ref(false);

onMounted(() => {
  form.value.serverUrl = config.serverUrl || "http://localhost:3000";
  form.value.apiKey = config.apiKey;
});

async function submit() {
  const url = form.value.serverUrl.trim();
  const key = form.value.apiKey.trim();
  if (!url || !key) {
    Message.warning("请填写服务器地址和 API 密钥");
    return;
  }

  loading.value = true;
  try {
    await checkHealth(url, key);
    config.save({ serverUrl: url, apiKey: key });
    Message.success("连接成功");
    router.push("/subscriptions");
  } catch (e: unknown) {
    const status = (e as { response?: { status: number } }).response?.status;
    if (status === 401) {
      Message.error("密钥错误，请检查后重试");
    } else {
      Message.error("无法连接服务器，请检查地址是否正确");
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="setup-wrap">
    <div class="setup-card">
      <h1 class="title">Mihomo Sub Manager</h1>
      <p class="subtitle">请配置服务器地址和 API 密钥以继续</p>

      <a-form layout="vertical">
        <a-form-item label="服务器地址">
          <a-input
            v-model="form.serverUrl"
            placeholder="http://your-server:3000"
            size="large"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="API 密钥">
          <a-input-password
            v-model="form.apiKey"
            placeholder="与服务端 API_KEY 一致"
            size="large"
          />
        </a-form-item>

        <a-button
          type="primary"
          size="large"
          long
          :loading="loading"
          style="margin-top: 8px"
          @click="submit"
        >
          测试连接并保存
        </a-button>
      </a-form>
    </div>
  </div>
</template>

<style scoped lang="less">
.setup-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-2);
}

.setup-card {
  width: 100%;
  max-width: 420px;
  padding: 40px 36px;
  border-radius: 12px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

.title {
  font-size: 22px;
  font-weight: 800;
  margin: 0 0 6px;
  color: var(--color-text-1);
}

.subtitle {
  font-size: 14px;
  color: var(--color-text-3);
  margin: 0 0 28px;
}
</style>
