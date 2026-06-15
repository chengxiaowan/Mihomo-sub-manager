import client from "./client";

export interface DnsConfig {
  enable: boolean;
  ipv6: boolean;
  "default-nameserver": string[];
  "enhanced-mode": string;
  "fake-ip-range": string;
  "use-hosts": boolean;
  nameserver: string[];
  "proxy-server-nameserver": string[];
}

export interface BaseConfig {
  "mixed-port": number;
  "allow-lan": boolean;
  "bind-address": string;
  mode: string;
  "log-level": string;
  "external-controller": string;
  dns: DnsConfig;
}

export interface Profile {
  id: string;
  name: string;
  token: string;
  enabled: boolean;
  defaultPolicy: string;
  baseConfig?: BaseConfig | null;
  createdAt: string;
  groups?: { id: string; name: string; type: string }[];
  _count?: { groups: number; rules: number };
}

const DEFAULT_NAMESERVERS = [
  "223.5.5.5",
  "119.29.29.29",
  "https://223.5.5.5/dns-query",
  "https://120.53.53.53/dns-query",
  "https://dns.alidns.com/dns-query",
  "https://doh.pub/dns-query",
];

export function defaultBaseConfig(): BaseConfig {
  return {
    "mixed-port": 7890,
    "allow-lan": true,
    "bind-address": "*",
    mode: "rule",
    "log-level": "info",
    "external-controller": "127.0.0.1:9090",
    dns: {
      enable: true,
      ipv6: false,
      "default-nameserver": ["223.5.5.5", "119.29.29.29"],
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.1/16",
      "use-hosts": true,
      nameserver: [...DEFAULT_NAMESERVERS],
      "proxy-server-nameserver": [...DEFAULT_NAMESERVERS],
    },
  };
}

export const profileApi = {
  list: () => client.get<Profile[]>("/profiles").then((r) => r.data),
  get: (id: string) => client.get<Profile>(`/profiles/${id}`).then((r) => r.data),
  create: (data: { name: string; enabled?: boolean; defaultPolicy?: string; baseConfig?: BaseConfig }) =>
    client.post<Profile>("/profiles", data).then((r) => r.data),
  update: (
    id: string,
    data: Partial<{ name: string; enabled: boolean; defaultPolicy: string; baseConfig: BaseConfig }>,
  ) => client.patch<Profile>(`/profiles/${id}`, data).then((r) => r.data),
  remove: (id: string) => client.delete(`/profiles/${id}`),
  regenerateToken: (id: string) =>
    client.post<{ token: string }>(`/profiles/${id}/token/regenerate`).then((r) => r.data),
  bindGroups: (id: string, groupIds: string[]) =>
    client.put(`/profiles/${id}/groups`, { groupIds }).then((r) => r.data),
};
