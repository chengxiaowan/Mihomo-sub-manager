import client from "./client";

export interface Subscription {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  refreshInterval: number | null;
  excludeKeywords: string[];
  fetchStatus: string | null;
  lastFetchedAt: string | null;
  createdAt: string;
}

export type SubscriptionInput = {
  name: string;
  url: string;
  enabled?: boolean;
  refreshInterval?: number;
  excludeKeywords?: string[];
};

export const subscriptionApi = {
  list: () => client.get<Subscription[]>("/subscriptions").then((r) => r.data),
  create: (data: SubscriptionInput) =>
    client.post<Subscription>("/subscriptions", data).then((r) => r.data),
  update: (id: string, data: Partial<SubscriptionInput>) =>
    client.patch<Subscription>(`/subscriptions/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/subscriptions/${id}`),
  refresh: (id: string) =>
    client.post<{ nodesAdded: number }>(`/subscriptions/${id}/refresh`).then((r) => r.data),
};
