import client from "./client";

export interface ProxyNode {
  id: string;
  name: string;
  type: string;
  server: string;
  port: number | null;
  enabled: boolean;
  tags: string;
  sourceId: string | null;
  source?: { id: string; name: string } | null;
  createdAt: string;
}

export interface NodePage {
  total: number;
  page: number;
  pageSize: number;
  items: ProxyNode[];
}

export const nodeApi = {
  list: (params?: {
    keyword?: string;
    type?: string;
    sourceId?: string;
    tag?: string;
    enabled?: boolean;
    page?: number;
    pageSize?: number;
  }) => client.get<NodePage>("/proxy-nodes", { params }).then((r) => r.data),
  update: (id: string, data: { enabled?: boolean; tags?: string[] }) =>
    client.patch(`/proxy-nodes/${id}`, data),
  remove: (id: string) => client.delete(`/proxy-nodes/${id}`),
};
