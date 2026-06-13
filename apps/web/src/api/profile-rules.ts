import client from "./client";

export interface ProfileRule {
  id: string;
  type: string;
  value?: string | null;
  policy: string;
  sort: number;
  enabled: boolean;
  profileId: string;
  createdAt: string;
}

export const profileRuleApi = {
  list: (profileId: string) =>
    client.get<ProfileRule[]>(`/profiles/${profileId}/rules`).then((r) => r.data),
  create: (profileId: string, data: { type: string; value?: string; policy: string; sort?: number; enabled?: boolean }) =>
    client.post<ProfileRule>(`/profiles/${profileId}/rules`, data).then((r) => r.data),
  update: (profileId: string, id: string, data: Partial<{ type: string; value: string; policy: string; enabled: boolean }>) =>
    client.patch<ProfileRule>(`/profiles/${profileId}/rules/${id}`, data).then((r) => r.data),
  remove: (profileId: string, id: string) =>
    client.delete(`/profiles/${profileId}/rules/${id}`),
  reorder: (profileId: string, ids: string[]) =>
    client.put(`/profiles/${profileId}/rules/reorder`, { ids }),
};
