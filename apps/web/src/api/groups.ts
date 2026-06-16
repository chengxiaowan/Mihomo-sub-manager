import client from "./client";
import type { ProxyNode } from "./nodes";

export interface ProxyGroup {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  sort: number;
  url?: string | null;
  interval?: number | null;
  tolerance?: number | null;
  lazy?: boolean | null;
  filter?: string | null;
  nodes?: ProxyNode[];
  _count?: { nodes: number };
}

export type ProxyGroupInput = Partial<{
  name: string;
  type: string;
  enabled: boolean;
  sort: number;
  url: string;
  interval: number;
  tolerance: number;
  lazy: boolean;
  filter: string;
}>;

export const groupApi = {
  list: () => client.get<ProxyGroup[]>("/proxy-groups").then((r) => r.data),
  get: (id: string) => client.get<ProxyGroup>(`/proxy-groups/${id}`).then((r) => r.data),
  create: (data: ProxyGroupInput & { name: string; type: string }) =>
    client.post<ProxyGroup>("/proxy-groups", data).then((r) => r.data),
  update: (id: string, data: ProxyGroupInput) =>
    client.patch<ProxyGroup>(`/proxy-groups/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/proxy-groups/${id}`),
  setNodes: (id: string, nodeIds: string[]) =>
    client.put(`/proxy-groups/${id}/nodes`, { nodeIds }).then((r) => r.data),
};
