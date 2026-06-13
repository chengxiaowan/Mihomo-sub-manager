import axios from "axios";
import { useConfigStore } from "@/stores/config";

const client = axios.create();

client.interceptors.request.use((config) => {
  const cfg = useConfigStore();
  config.baseURL = cfg.serverUrl.replace(/\/$/, "") + "/api";
  config.headers["X-Api-Key"] = cfg.apiKey;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // 密钥错误，清除配置并跳回 setup
      const cfg = useConfigStore();
      cfg.clear();
      window.location.href = "/setup";
    }
    return Promise.reject(err as Error);
  }
);

export default client;
