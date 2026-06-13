import { createWebHistory, createRouter } from "vue-router";
import { useConfigStore } from "@/stores/config";

const routes = [
  {
    path: "/setup",
    name: "Setup",
    component: () => import("@/views/setup.vue"),
    meta: { skipAuth: true },
  },
  {
    path: "/",
    component: () => import("@/layout/index.vue"),
    children: [
      { path: "", redirect: "/subscriptions" },
      {
        path: "subscriptions",
        name: "Subscriptions",
        component: () => import("@/views/subscriptions.vue"),
      },
      {
        path: "nodes",
        name: "Nodes",
        component: () => import("@/views/nodes.vue"),
      },
      {
        path: "proxy-groups",
        name: "ProxyGroups",
        component: () => import("@/views/proxy-groups.vue"),
      },
      {
        path: "rules",
        name: "Rules",
        component: () => import("@/views/rules.vue"),
      },
      {
        path: "profiles",
        name: "Profiles",
        component: () => import("@/views/profiles.vue"),
      },
      { path: ":pathMatch(.*)*", redirect: "/subscriptions" },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (to.meta.skipAuth) return true;
  const config = useConfigStore();
  if (!config.isConfigured) return "/setup";
  return true;
});
