import { createWebHistory, createRouter } from "vue-router";

const routes = [
  {
    path: "/",
    component: () => import("@/layout/index.vue"),
    children: [
      {
        path: "",
        redirect: "/dashboard",
      },
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("@/views/dashboard.vue"),
      },
      {
        path: "/:pathMatch(.*)*",
        redirect: "/dashboard",
      },
    ],
  },
  {
    path: "/welcome",
    name: "Welcome",
    component: () => import("@/views/welcome.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/dashboard",
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
