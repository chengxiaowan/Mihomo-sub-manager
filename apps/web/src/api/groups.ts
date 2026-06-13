import client from "./client";
import type { ProxyNode } from "./nodes";

export interface ProxyGroup {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  sort: number;
  nodes?: ProxyNode[];
  _count?: { nodes: number };
}

export const groupApi = {
  list: () => client.get<ProxyGroup[]>("/proxy-groups").then((r) => r.data),
  get: (id: string) => client.get<ProxyGroup>(`/proxy-groups/${id}`).then((r) => r.data),
  create: (data: { name: string; type: string; enabled?: boolean; sort?: number }) =>
    client.post<ProxyGroup>("/proxy-groups", data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; type: string; enabled: boolean; sort: number }>) =>
    client.patch<ProxyGroup>(`/proxy-groups/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/proxy-groups/${id}`),
  setNodes: (id: string, nodeIds: string[]) =>
    client.put(`/proxy-groups/${id}/nodes`, { nodeIds }).then((r) => r.data),
};
