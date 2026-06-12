import { Injectable, Logger } from '@nestjs/common';
import { load as yamlLoad } from 'js-yaml';

export interface ParsedNode {
  name: string;
  type: string;
  server: string;
  port: number;
  raw: Record<string, unknown>;
}

@Injectable()
export class SubscriptionParserService {
  private readonly logger = new Logger(SubscriptionParserService.name);

  async fetchAndParse(url: string): Promise<ParsedNode[]> {
    const text = await this.fetch(url);
    return this.parse(text);
  }

  private async fetch(url: string): Promise<string> {
    const res = await globalThis.fetch(url, {
      headers: { 'User-Agent': 'ClashMeta/1.18.0' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res.text();
  }

  private parse(content: string): ParsedNode[] {
    const trimmed = content.trim();

    // 1. YAML 格式（直接包含 proxies: 列表）
    if (this.looksLikeYaml(trimmed)) {
      return this.parseYaml(trimmed);
    }

    // 2. 尝试 base64 解码，解码后可能是 URI 列表或 YAML
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf-8').trim();
      if (this.looksLikeYaml(decoded)) return this.parseYaml(decoded);
      if (decoded.includes('://')) return this.parseUriLines(decoded);
    } catch {
      // 不是合法 base64，继续
    }

    // 3. 原始 URI 列表
    return this.parseUriLines(trimmed);
  }

  private looksLikeYaml(text: string): boolean {
    return /^(proxies|mixed-port|port|socks-port):/m.test(text);
  }

  private parseYaml(text: string): ParsedNode[] {
    const doc = yamlLoad(text) as Record<string, unknown>;
    const proxies = doc?.proxies;
    if (!Array.isArray(proxies)) return [];

    const nodes: ParsedNode[] = [];
    for (const proxy of proxies) {
      try {
        nodes.push(this.yamlProxyToNode(proxy as Record<string, unknown>));
      } catch (e) {
        this.logger.warn(`跳过无效 YAML 节点: ${(e as Error).message}`);
      }
    }
    return nodes;
  }

  private yamlProxyToNode(p: Record<string, unknown>): ParsedNode {
    const { name, type, server, port, ...rest } = p;
    if (!name || !type || !server || !port) throw new Error('缺少必要字段');
    return this.toParsedNode({
      name: String(name),
      type: String(type),
      server: String(server),
      port: Number(port),
      raw: rest,
    });
  }

  private parseUriLines(text: string): ParsedNode[] {
    const nodes: ParsedNode[] = [];
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      try {
        const node = this.parseLine(l);
        if (node) nodes.push(node);
      } catch (e) {
        this.logger.warn(
          `跳过无法解析的节点: ${l.slice(0, 60)}… 原因: ${(e as Error).message}`,
        );
      }
    }
    return nodes;
  }

  private parseLine(line: string): ParsedNode | null {
    if (line.startsWith('vmess://')) return this.parseVmess(line);
    if (line.startsWith('vless://')) return this.parseVless(line);
    if (line.startsWith('trojan://')) return this.parseTrojan(line);
    if (line.startsWith('ss://')) return this.parseSS(line);
    return null;
  }

  // ── vmess://base64(json) ─────────────────────────────────────────────────
  private parseVmess(uri: string): ParsedNode {
    const j = JSON.parse(Buffer.from(uri.slice(8), 'base64').toString('utf-8'));
    const raw: Record<string, unknown> = {
      uuid: j.id,
      alterId: Number(j.aid ?? 0),
      cipher: j.scy || 'auto',
    };
    const net: string = j.net || 'tcp';
    if (net !== 'tcp') raw['network'] = net;
    if (j.tls === 'tls') raw['tls'] = true;
    if (j.sni) raw['servername'] = j.sni;
    if (net === 'ws') {
      raw['ws-opts'] = {
        path: j.path || '/',
        ...(j.host ? { headers: { Host: j.host } } : {}),
      };
    }
    if (net === 'grpc')
      raw['grpc-opts'] = { 'grpc-service-name': j.path || '' };
    if (net === 'h2') raw['h2-opts'] = { path: j.path || '/', host: [j.host] };
    return this.toParsedNode({
      name: j.ps || j.add,
      type: 'vmess',
      server: j.add,
      port: Number(j.port),
      raw,
    });
  }

  // ── vless://uuid@server:port?params#name ─────────────────────────────────
  private parseVless(uri: string): ParsedNode {
    const url = new URL(uri);
    const p = url.searchParams;
    const raw: Record<string, unknown> = { uuid: url.username, udp: true };

    const security = p.get('security') || '';
    if (security === 'tls' || security === 'reality') raw['tls'] = true;
    if (security === 'reality') {
      raw['reality-opts'] = {
        'public-key': p.get('pbk') || '',
        'short-id': p.get('sid') || '',
      };
    }
    if (p.get('sni')) raw['servername'] = p.get('sni');
    if (p.get('fp')) raw['client-fingerprint'] = p.get('fp');

    const type = p.get('type') || 'tcp';
    if (type !== 'tcp') raw['network'] = type;
    if (type === 'ws') {
      raw['ws-opts'] = {
        path: p.get('path') || '/',
        ...(p.get('host') ? { headers: { Host: p.get('host') } } : {}),
      };
    }
    if (type === 'grpc')
      raw['grpc-opts'] = { 'grpc-service-name': p.get('serviceName') || '' };

    return this.toParsedNode({
      name: url.hash ? decodeURIComponent(url.hash.slice(1)) : url.hostname,
      type: 'vless',
      server: url.hostname,
      port: Number(url.port),
      raw,
    });
  }

  // ── trojan://password@server:port?params#name ────────────────────────────
  private parseTrojan(uri: string): ParsedNode {
    const url = new URL(uri);
    const p = url.searchParams;
    const raw: Record<string, unknown> = {
      password: decodeURIComponent(url.username),
      udp: true,
    };
    if (p.get('sni')) raw['sni'] = p.get('sni');
    if (p.get('fp')) raw['client-fingerprint'] = p.get('fp');

    const type = p.get('type') || 'tcp';
    if (type !== 'tcp') raw['network'] = type;
    if (type === 'ws') {
      raw['ws-opts'] = {
        path: p.get('path') || '/',
        ...(p.get('host') ? { headers: { Host: p.get('host') } } : {}),
      };
    }
    if (type === 'grpc')
      raw['grpc-opts'] = { 'grpc-service-name': p.get('serviceName') || '' };

    return this.toParsedNode({
      name: url.hash ? decodeURIComponent(url.hash.slice(1)) : url.hostname,
      type: 'trojan',
      server: url.hostname,
      port: Number(url.port),
      raw,
    });
  }

  // ── ss://base64(method:pass)@host:port#name  或  ss://base64(全部)#name ──
  private parseSS(uri: string): ParsedNode {
    const withoutScheme = uri.slice(5);
    const hashIdx = withoutScheme.indexOf('#');
    const name =
      hashIdx >= 0 ? decodeURIComponent(withoutScheme.slice(hashIdx + 1)) : '';
    const mainWithQuery =
      hashIdx >= 0 ? withoutScheme.slice(0, hashIdx) : withoutScheme;
    const queryIdx = mainWithQuery.indexOf('?');
    const main =
      queryIdx >= 0 ? mainWithQuery.slice(0, queryIdx) : mainWithQuery;

    const atIdx = main.lastIndexOf('@');
    if (atIdx >= 0) {
      // SIP002: userinfo@host:port
      const userinfo = main.slice(0, atIdx);
      const { host, port } = this.parseHostPort(main.slice(atIdx + 1));
      const { cipher, password } = this.parseSSUserinfo(userinfo);
      return this.toParsedNode({
        name: name || host,
        type: 'ss',
        server: host,
        port,
        raw: { cipher, password },
      });
    }

    // 旧格式：整体 base64
    const decoded = this.decodeBase64(main);
    const sepIdx = decoded.lastIndexOf('@');
    if (sepIdx < 0) throw new Error('invalid ss uri');
    const userinfo = decoded.slice(0, sepIdx);
    const { host, port } = this.parseHostPort(decoded.slice(sepIdx + 1));
    const { cipher, password } = this.splitUserinfo(userinfo);
    return this.toParsedNode({
      name: name || host,
      type: 'ss',
      server: host,
      port,
      raw: { cipher, password },
    });
  }

  private parseSSUserinfo(userinfo: string): {
    cipher: string;
    password: string;
  } {
    const decodedUserinfo = decodeURIComponent(userinfo);
    if (decodedUserinfo.includes(':'))
      return this.splitUserinfo(decodedUserinfo);
    return this.splitUserinfo(this.decodeBase64(userinfo));
  }

  private splitUserinfo(userinfo: string): {
    cipher: string;
    password: string;
  } {
    const ci = userinfo.indexOf(':');
    if (ci <= 0 || ci === userinfo.length - 1)
      throw new Error('invalid userinfo');
    return {
      cipher: decodeURIComponent(userinfo.slice(0, ci)),
      password: decodeURIComponent(userinfo.slice(ci + 1)),
    };
  }

  private parseHostPort(value: string): { host: string; port: number } {
    if (value.startsWith('[')) {
      const end = value.indexOf(']');
      if (end < 0 || value[end + 1] !== ':')
        throw new Error('invalid host:port');
      return {
        host: value.slice(1, end),
        port: this.parsePort(value.slice(end + 2)),
      };
    }

    const sepIdx = value.lastIndexOf(':');
    if (sepIdx <= 0 || sepIdx === value.length - 1)
      throw new Error('invalid host:port');
    return {
      host: value.slice(0, sepIdx),
      port: this.parsePort(value.slice(sepIdx + 1)),
    };
  }

  private parsePort(value: string): number {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error('invalid port');
    return port;
  }

  private decodeBase64(value: string): string {
    if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(value))
      throw new Error('invalid base64');
    return Buffer.from(value, 'base64').toString('utf-8');
  }

  private toParsedNode(node: ParsedNode): ParsedNode {
    if (!node.name) throw new Error('missing node name');
    if (!node.server) throw new Error('missing server');
    this.parsePort(String(node.port));
    return node;
  }
}
