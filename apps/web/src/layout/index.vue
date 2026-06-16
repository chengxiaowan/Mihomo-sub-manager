<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useConfigStore } from "@/stores/config";
import { router } from "@/router";

const route = useRoute();
const config = useConfigStore();

const navItems = [
  { key: "subscriptions", label: "订阅源", to: "/subscriptions" },
  { key: "nodes", label: "节点库", to: "/nodes" },
  { key: "proxy-groups", label: "代理组", to: "/proxy-groups" },
  { key: "profiles", label: "配置方案", to: "/profiles" },
  { key: "rule-market", label: "规则市场", to: "/rule-market" },
  { key: "rule-providers", label: "规则集", to: "/rule-providers" },
  { key: "logs", label: "操作日志", to: "/logs" },
];

const isDark = ref(true);

const syncTheme = (dark: boolean) => {
  document.body.setAttribute("arco-theme", dark ? "dark" : "light");
};

watch(isDark, syncTheme, { immediate: true });

function logout() {
  config.clear();
  router.push("/setup");
}
</script>

<template>
  <div class="app-shell">
    <header class="top-nav">
      <div class="nav-inner">
        <RouterLink class="brand" to="/subscriptions">Mihomo Sub</RouterLink>

        <nav class="nav-links" aria-label="Primary navigation">
          <RouterLink
            v-for="item in navItems"
            :key="item.key"
            :to="item.to"
            class="nav-link"
            :class="{ active: route.path.startsWith(item.to) }"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="account">
          <a
            class="github-link"
            href="https://github.com/chengxiaowan/Mihomo-sub-manager"
            target="_blank"
            rel="noreferrer"
            title="GitHub"
            aria-label="GitHub"
          >
            <icon-github />
          </a>
          <a-button
            class="theme-button"
            shape="circle"
            type="text"
            :aria-label="isDark ? '切换到明亮模式' : '切换到暗色模式'"
            @click="isDark = !isDark"
          >
            <template #icon>
              <icon-sun-fill v-if="isDark" />
              <icon-moon-fill v-else />
            </template>
          </a-button>
          <a-button type="text" shape="circle" class="theme-button" title="重新配置" @click="logout">
            <template #icon><icon-settings /></template>
          </a-button>
        </div>
      </div>
    </header>

    <main class="page">
      <RouterView />
    </main>
  </div>
</template>

<style scoped lang="less">
.app-shell {
  min-height: 100vh;
  color: var(--color-text-1);
  background: var(--color-bg-2);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.top-nav {
  border-bottom: 1px solid var(--color-border-2);
  background: var(--color-bg-1);
}

.nav-inner {
  max-width: 1440px;
  width: 100%;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 28px;
  margin: 0 auto;
  padding: 0 32px;
  box-sizing: border-box;
}

.brand {
  flex: 0 0 auto;
  color: var(--color-text-1);
  font-size: 21px;
  font-weight: 800;
  text-decoration: none;
}

.nav-links {
  flex: 1 1 auto;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.nav-link {
  height: 36px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  border-radius: 7px;
  color: var(--color-text-2);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s, background 0.15s;

  &:hover {
    color: rgb(var(--arcoblue-6));
    background: var(--color-fill-2);
  }

  &.active {
    color: rgb(var(--arcoblue-6));
    background: var(--color-fill-2);
  }
}

.account {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.github-link {
  width: 38px;
  height: 38px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  color: var(--color-text-2);
  border-radius: 7px;
  font-size: 20px;
  text-decoration: none;

  &:hover {
    color: rgb(var(--arcoblue-6));
    background: var(--color-fill-2);
  }
}

.theme-button {
  width: 38px;
  height: 38px;
  color: var(--color-text-2);
  font-size: 20px;

  &:hover {
    color: rgb(var(--arcoblue-6));
    background: var(--color-fill-2);
  }
}

.page {
  max-width: 1440px;
  margin: 0 auto;
  padding: 28px 32px 48px;
}

@media (max-width: 820px) {
  .nav-inner {
    height: auto;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
  }

  .nav-links {
    width: 100%;
    height: 40px;
    overflow-x: auto;
  }

  .page {
    padding: 20px 16px 36px;
  }
}
</style>
