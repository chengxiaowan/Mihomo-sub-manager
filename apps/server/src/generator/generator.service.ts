import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { dump as yamlDump } from 'js-yaml';
import { ProfileService } from '../profile/profile.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { normalizeBaseConfig, type BaseConfig } from '../profile/base-config';

const TEST_URL = 'http://www.gstatic.com/generate_204';
const TEST_INTERVAL = 300;
const BUILTIN_POLICIES = new Set([
  'DIRECT',
  'REJECT',
  'REJECT-DROP',
  'PASS',
  'COMPATIBLE',
  'GLOBAL',
]);

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

// 校验所需的最小结构（与 findByToken/findForGenerate 返回一致）
interface ProfileForValidate {
  defaultPolicy: string;
  groups: { name: string; nodes: { name: string }[] }[];
  rules: { type: string; value: string | null; policy: string }[];
  providers: { name: string }[];
}

@Injectable()
export class GeneratorService {
  private readonly logger = new Logger(GeneratorService.name);

  constructor(
    private readonly profileService: ProfileService,
    private readonly opLog: OperationLogService,
  ) {}

  async generateYaml(token: string): Promise<string> {
    const profile = await this.profileService.findByToken(token);

    const result = this.validateProfile(profile);
    if (result.errors.length) {
      throw new UnprocessableEntityException({
        message: '配置方案校验未通过，无法发布',
        errors: result.errors,
      });
    }
    if (result.warnings.length) {
      this.opLog.record({
        action: 'publish.warn',
        entityType: 'Profile',
        entityId: profile.id,
        status: 'info',
        message: `发布方案「${profile.name}」存在 ${result.warnings.length} 条告警`,
        detail: { warnings: result.warnings },
      });
    }

    // 收集所有启用节点，去重（同名节点只保留第一个）
    const seenNames = new Set<string>();
    const proxies: Record<string, unknown>[] = [];

    for (const group of profile.groups) {
      for (const node of group.nodes) {
        if (seenNames.has(node.name)) continue;
        seenNames.add(node.name);
        proxies.push(this.buildProxy(node));
      }
    }

    const proxyGroups = profile.groups.map((group) => {
      const memberNames = group.nodes
        .map((n) => n.name)
        .filter((name) => seenNames.has(name));

      const entry: Record<string, unknown> = {
        name: group.name,
        type: group.type,
        proxies: memberNames,
      };

      const isTesting = ['url-test', 'fallback', 'load-balance'].includes(
        group.type,
      );
      if (isTesting) {
        entry['url'] = group.url || TEST_URL;
        entry['interval'] = group.interval ?? TEST_INTERVAL;
        if (group.lazy != null) entry['lazy'] = group.lazy;
      }
      if (group.type === 'url-test' && group.tolerance != null) {
        entry['tolerance'] = group.tolerance;
      }
      if (group.filter) entry['filter'] = group.filter;

      return entry;
    });

    // 构建规则列表，过滤掉已禁用的
    const rules: string[] = profile.rules.map(
      (r) => `${r.type}${r.value ? ',' + r.value : ''},${r.policy}`,
    );

    // 追加 MATCH 兜底规则
    rules.push(`MATCH,${profile.defaultPolicy}`);

    // rule-providers 段：仅当有绑定且启用的规则集时才输出
    const ruleProviders: Record<string, Record<string, unknown>> = {};
    for (const p of profile.providers) {
      ruleProviders[p.name] = this.buildRuleProvider(p);
    }

    // 通用配置（mixed-port / dns 等）展开到 YAML 顶层；
    // 归一化保证即使存量数据为 null 或部分对象也补齐完整默认值
    const base = normalizeBaseConfig(
      profile.baseConfig as Partial<BaseConfig> | null,
    );

    const doc: Record<string, unknown> = {
      ...base,
      proxies,
      'proxy-groups': proxyGroups,
      ...(Object.keys(ruleProviders).length
        ? { 'rule-providers': ruleProviders }
        : {}),
      rules,
    };

    return yamlDump(doc, { lineWidth: -1, noRefs: true });
  }

  async validateById(id: string): Promise<ValidationResult> {
    const profile = await this.profileService.findForGenerate(id);
    return this.validateProfile(profile);
  }

  validateProfile(profile: ProfileForValidate): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const groupNames = new Set(profile.groups.map((g) => g.name));
    const providerNames = new Set(profile.providers.map((p) => p.name));
    const nodeNames = new Set(
      profile.groups.flatMap((g) => g.nodes.map((n) => n.name)),
    );
    const isValidPolicy = (policy: string) =>
      BUILTIN_POLICIES.has(policy) ||
      groupNames.has(policy) ||
      nodeNames.has(policy);

    // 致命：规则去向 / RULE-SET 引用
    profile.rules.forEach((r, i) => {
      const label = `规则 #${i + 1}（${r.type}${r.value ? ',' + r.value : ''}）`;
      if (!isValidPolicy(r.policy)) {
        errors.push(
          `${label} 的去向「${r.policy}」不是内置策略，也不是已绑定的代理组`,
        );
      }
      if (r.type === 'RULE-SET') {
        if (!r.value) {
          errors.push(`${label} 缺少规则集名称`);
        } else if (!providerNames.has(r.value)) {
          errors.push(`${label} 引用的规则集「${r.value}」未绑定到本方案`);
        }
      }
    });
    if (!isValidPolicy(profile.defaultPolicy)) {
      errors.push(
        `兜底策略「${profile.defaultPolicy}」不是内置策略，也不是已绑定的代理组`,
      );
    }

    // 软：空组 / 重名节点 / 空方案
    for (const g of profile.groups) {
      if (g.nodes.length === 0) {
        warnings.push(`代理组「${g.name}」没有可用的启用节点`);
      }
    }
    const seen = new Set<string>();
    const dup = new Set<string>();
    for (const name of profile.groups.flatMap((g) =>
      g.nodes.map((n) => n.name),
    )) {
      if (seen.has(name)) dup.add(name);
      else seen.add(name);
    }
    if (dup.size) {
      warnings.push(
        `存在跨组重名节点（仅保留首个）：${[...dup].slice(0, 5).join('、')}${dup.size > 5 ? ' 等' : ''}`,
      );
    }
    if (profile.groups.length === 0) warnings.push('方案未绑定任何代理组');
    if (profile.rules.length === 0)
      warnings.push('方案没有任何规则，将全部走兜底策略');

    return { errors, warnings };
  }

  private buildRuleProvider(p: {
    name: string;
    type: string;
    behavior: string;
    format: string;
    url: string | null;
    path: string | null;
    interval: number | null;
    proxy: string | null;
    payload: string;
  }): Record<string, unknown> {
    const entry: Record<string, unknown> = {
      type: p.type,
      behavior: p.behavior,
    };

    if (p.type === 'inline') {
      entry['payload'] = this.parsePayload(p.payload);
      return entry;
    }

    // http：客户端自行下载，path 作为客户端本地缓存路径
    entry['format'] = p.format;
    if (p.url) entry['url'] = p.url;
    entry['path'] = p.path || `./ruleset/${p.name}.yaml`;
    if (p.interval != null) entry['interval'] = p.interval;
    if (p.proxy) entry['proxy'] = p.proxy;
    return entry;
  }

  private parsePayload(raw: string): string[] {
    try {
      const arr: unknown = JSON.parse(raw);
      return Array.isArray(arr)
        ? arr.filter((x): x is string => typeof x === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private buildProxy(node: {
    name: string;
    type: string;
    server: string;
    port: number | null;
    raw: unknown;
  }): Record<string, unknown> {
    const raw = (node.raw ?? {}) as Record<string, unknown>;
    return {
      name: node.name,
      type: node.type,
      server: node.server,
      port: node.port,
      ...raw,
    };
  }
}
