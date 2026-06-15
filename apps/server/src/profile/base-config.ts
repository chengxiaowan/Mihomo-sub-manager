/**
 * Mihomo 通用配置（general + dns）。
 * 以 Mihomo 原始键名（kebab-case）存储，generator 直接展开到 YAML 顶层。
 */
export interface DnsConfig {
  enable: boolean;
  ipv6: boolean;
  'default-nameserver': string[];
  'enhanced-mode': string;
  'fake-ip-range': string;
  'use-hosts': boolean;
  nameserver: string[];
  'proxy-server-nameserver': string[];
}

export interface BaseConfig {
  'mixed-port': number;
  'allow-lan': boolean;
  'bind-address': string;
  mode: string;
  'log-level': string;
  'external-controller': string;
  dns: DnsConfig;
}

const DEFAULT_NAMESERVERS = [
  '223.5.5.5',
  '119.29.29.29',
  'https://223.5.5.5/dns-query',
  'https://120.53.53.53/dns-query',
  'https://dns.alidns.com/dns-query',
  'https://doh.pub/dns-query',
];

/**
 * 把（可能不完整的）输入深度合并到默认配置上，保证产出始终是完整的 BaseConfig。
 * - 顶层字段：输入覆盖默认
 * - dns 子对象：逐字段合并（输入的数组整体替换默认数组）
 * - 输入为空 / 非对象：返回一份默认配置
 */
export function normalizeBaseConfig(
  input?: Partial<BaseConfig> | null,
): BaseConfig {
  const base = structuredClone(DEFAULT_BASE_CONFIG);
  if (!input || typeof input !== 'object') return base;
  const { dns, ...rest } = input;
  return {
    ...base,
    ...rest,
    dns: { ...base.dns, ...(dns ?? {}) },
  };
}

export const DEFAULT_BASE_CONFIG: BaseConfig = {
  'mixed-port': 7890,
  'allow-lan': true,
  'bind-address': '*',
  mode: 'rule',
  'log-level': 'info',
  'external-controller': '127.0.0.1:9090',
  dns: {
    enable: true,
    ipv6: false,
    'default-nameserver': ['223.5.5.5', '119.29.29.29'],
    'enhanced-mode': 'fake-ip',
    'fake-ip-range': '198.18.0.1/16',
    'use-hosts': true,
    nameserver: [...DEFAULT_NAMESERVERS],
    'proxy-server-nameserver': [...DEFAULT_NAMESERVERS],
  },
};
