import client from "./client";

export interface RuleTemplateItem {
  id: string;
  type: string;
  value?: string | null;
  sort: number;
  templateId: string;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: RuleTemplateItem[];
  _count?: { items: number };
}

export const ruleTemplateApi = {
  list: () => client.get<RuleTemplate[]>("/rule-templates").then((r) => r.data),
  get: (id: string) => client.get<RuleTemplate>(`/rule-templates/${id}`).then((r) => r.data),
  create: (data: { name: string; description?: string; items?: { type: string; value?: string }[] }) =>
    client.post<RuleTemplate>("/rule-templates", data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; description: string; items: { type: string; value?: string }[] }>) =>
    client.patch<RuleTemplate>(`/rule-templates/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/rule-templates/${id}`),
  import: (id: string, data: { profileId: string; policy: string; mode: "append" | "overwrite" }) =>
    client.post<{ imported: number }>(`/rule-templates/${id}/import`, data).then((r) => r.data),
};
