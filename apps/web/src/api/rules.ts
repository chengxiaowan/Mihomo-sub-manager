import client from "./client";

export interface Rule {
  id: string;
  type: string;
  value: string;
  policy: string;
  enabled: boolean;
  sort: number;
}

export const ruleApi = {
  list: () => client.get<Rule[]>("/rules").then((r) => r.data),
  create: (data: { type: string; value: string; policy: string; enabled?: boolean }) =>
    client.post<Rule>("/rules", data).then((r) => r.data),
  update: (id: string, data: Partial<Rule>) =>
    client.patch<Rule>(`/rules/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/rules/${id}`),
  reorder: (ids: string[]) => client.put("/rules/reorder", { ids }),
};
