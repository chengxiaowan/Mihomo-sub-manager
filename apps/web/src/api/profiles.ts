import client from "./client";

export interface Profile {
  id: string;
  name: string;
  token: string;
  enabled: boolean;
  defaultPolicy: string;
  createdAt: string;
  groups?: { id: string; name: string; type: string }[];
  _count?: { groups: number; rules: number };
}

export const profileApi = {
  list: () => client.get<Profile[]>("/profiles").then((r) => r.data),
  get: (id: string) => client.get<Profile>(`/profiles/${id}`).then((r) => r.data),
  create: (data: { name: string; enabled?: boolean; defaultPolicy?: string }) =>
    client.post<Profile>("/profiles", data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; enabled: boolean; defaultPolicy: string }>) =>
    client.patch<Profile>(`/profiles/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/profiles/${id}`),
  regenerateToken: (id: string) =>
    client.post<{ token: string }>(`/profiles/${id}/token/regenerate`).then((r) => r.data),
  bindGroups: (id: string, groupIds: string[]) =>
    client.put(`/profiles/${id}/groups`, { groupIds }).then((r) => r.data),
};
