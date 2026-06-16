import client from "./client";

export interface RuleProvider {
  id: string;
  name: string;
  type: string; // http | file | inline
  behavior: string; // domain | ipcidr | classical
  format: string; // yaml | text | mrs
  url?: string | null;
  path?: string | null;
  interval?: number | null;
  proxy?: string | null;
  payload: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RuleProviderInput = Partial<{
  name: string;
  type: string;
  behavior: string;
  format: string;
  url: string;
  path: string;
  interval: number;
  proxy: string;
  payload: string[];
  enabled: boolean;
}>;

export const ruleProviderApi = {
  list: () => client.get<RuleProvider[]>("/rule-providers").then((r) => r.data),
  get: (id: string) => client.get<RuleProvider>(`/rule-providers/${id}`).then((r) => r.data),
  create: (data: RuleProviderInput & { name: string; type: string; behavior: string }) =>
    client.post<RuleProvider>("/rule-providers", data).then((r) => r.data),
  update: (id: string, data: RuleProviderInput) =>
    client.patch<RuleProvider>(`/rule-providers/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/rule-providers/${id}`),
};
