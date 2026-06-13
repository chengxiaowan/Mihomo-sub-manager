import client from "./client";

export interface Subscription {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  fetchStatus: string | null;
  lastFetchedAt: string | null;
  createdAt: string;
}

export const subscriptionApi = {
  list: () => client.get<Subscription[]>("/subscriptions").then((r) => r.data),
  create: (data: { name: string; url: string; enabled?: boolean }) =>
    client.post<Subscription>("/subscriptions", data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; url: string; enabled: boolean }>) =>
    client.patch<Subscription>(`/subscriptions/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/subscriptions/${id}`),
  refresh: (id: string) =>
    client.post<{ nodesAdded: number }>(`/subscriptions/${id}/refresh`).then((r) => r.data),
};
