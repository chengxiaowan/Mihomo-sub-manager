import client from "./client";
import type { ProxyGroup } from "./groups";
import type { Rule } from "./rules";

export interface Profile {
  id: string;
  name: string;
  token: string;
  enabled: boolean;
  createdAt: string;
  groups?: ProxyGroup[];
  rules?: Rule[];
  _count?: { groups: number; rules: number };
}

export const profileApi = {
  list: () => client.get<Profile[]>("/profiles").then((r) => r.data),
  get: (id: string) => client.get<Profile>(`/profiles/${id}`).then((r) => r.data),
  create: (data: { name: string; enabled?: boolean }) =>
    client.post<Profile>("/profiles", data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; enabled: boolean }>) =>
    client.patch<Profile>(`/profiles/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/profiles/${id}`),
  regenerateToken: (id: string) =>
    client.post<Profile>(`/profiles/${id}/token/regenerate`).then((r) => r.data),
  bind: (id: string, data: { groupIds?: string[]; ruleIds?: string[] }) =>
    client.put<Profile>(`/profiles/${id}/bind`, data).then((r) => r.data),
};
