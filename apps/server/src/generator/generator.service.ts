import { Injectable } from '@nestjs/common';
import { dump as yamlDump } from 'js-yaml';
import { ProfileService } from '../profile/profile.service';
import { normalizeBaseConfig, type BaseConfig } from '../profile/base-config';

const TEST_URL = 'http://www.gstatic.com/generate_204';
const TEST_INTERVAL = 300;

@Injectable()
export class GeneratorService {
  constructor(private readonly profileService: ProfileService) {}

  async generateYaml(token: string): Promise<string> {
    const profile = await this.profileService.findByToken(token);

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

      if (['url-test', 'fallback', 'load-balance'].includes(group.type)) {
        entry['url'] = TEST_URL;
        entry['interval'] = TEST_INTERVAL;
      }

      return entry;
    });

    // 构建规则列表，过滤掉已禁用的
    const rules: string[] = profile.rules.map(
      (r) => `${r.type}${r.value ? ',' + r.value : ''},${r.policy}`,
    );

    // 追加 MATCH 兜底规则
    rules.push(`MATCH,${profile.defaultPolicy}`);

    // 通用配置（mixed-port / dns 等）展开到 YAML 顶层；
    // 归一化保证即使存量数据为 null 或部分对象也补齐完整默认值
    const base = normalizeBaseConfig(
      profile.baseConfig as Partial<BaseConfig> | null,
    );

    const doc: Record<string, unknown> = {
      ...base,
      proxies,
      'proxy-groups': proxyGroups,
      rules,
    };

    return yamlDump(doc, { lineWidth: -1, noRefs: true });
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
