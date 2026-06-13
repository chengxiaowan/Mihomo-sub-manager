import { defineStore } from "pinia";
import { ref, computed } from "vue";

const STORAGE_KEY = "mihomo-config";

interface Config {
  serverUrl: string;
  apiKey: string;
}

export const useConfigStore = defineStore("config", () => {
  const serverUrl = ref("");
  const apiKey = ref("");

  const isConfigured = computed(
    () => serverUrl.value.trim() !== "" && apiKey.value.trim() !== ""
  );

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const cfg: Config = JSON.parse(raw);
      serverUrl.value = cfg.serverUrl ?? "";
      apiKey.value = cfg.apiKey ?? "";
    } catch {
      // ignore malformed storage
    }
  }

  function save(cfg: Config) {
    serverUrl.value = cfg.serverUrl.trim();
    apiKey.value = cfg.apiKey.trim();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ serverUrl: serverUrl.value, apiKey: apiKey.value }));
  }

  function clear() {
    serverUrl.value = "";
    apiKey.value = "";
    localStorage.removeItem(STORAGE_KEY);
  }

  // 初始化时立刻从 localStorage 还原
  load();

  return { serverUrl, apiKey, isConfigured, save, clear };
});
