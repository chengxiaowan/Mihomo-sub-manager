<script setup lang="ts">
import { ref, watch } from "vue";

const navItems = [
  { key: "home", label: "首页", active: true },
  { key: "sources", label: "订阅源" },
  { key: "nodes", label: "节点列表" },
  { key: "rules", label: "规则配置" },
  { key: "publish", label: "发布管理" },
];

const isDark = ref(true);

const syncTheme = (dark: boolean) => {
  if (typeof document !== "undefined") {
    document.body.setAttribute("arco-theme", dark ? "dark" : "light");
  }
};

watch(isDark, syncTheme, { immediate: true });
</script>

<template>
  <div class="app-shell">
    <header class="top-nav">
      <div class="nav-inner">
        <RouterLink class="brand" to="/dashboard">Mihomo Sub</RouterLink>

        <nav class="nav-links" aria-label="Primary navigation">
          <button
            v-for="item in navItems"
            :key="item.key"
            type="button"
            class="nav-link"
            :class="{ active: item.active }"
            :aria-current="item.active ? 'page' : undefined"
          >
            {{ item.label }}
          </button>
        </nav>

        <div class="account">
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
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
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
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0;
}

.nav-links {
  min-width: 0;
  flex: 1 1 auto;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-link {
  height: 36px;
  padding: 0 12px;
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: var(--color-text-2);
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: default;
}

.nav-link:hover {
  color: rgb(var(--arcoblue-6));
  background: var(--color-fill-2);
}

.nav-link.active {
  color: rgb(var(--arcoblue-6));
  background: var(--color-fill-2);
}

.account {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.theme-button {
  width: 38px;
  height: 38px;
  color: var(--color-text-2);
  font-size: 20px;
}

.theme-button:hover {
  color: rgb(var(--arcoblue-6));
  background: var(--color-fill-2);
}

.page {
  max-width: 1440px;
  margin: 0 auto;
  padding: 28px 32px 48px;
}

@media (max-width: 820px) {
  .nav-inner {
    height: auto;
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }

  .nav-links {
    width: 100%;
    height: 42px;
    gap: 22px;
    overflow-x: auto;
  }

  .account {
    width: 100%;
    justify-content: space-between;
  }

  .page {
    padding: 22px 16px 36px;
  }
}
</style>
