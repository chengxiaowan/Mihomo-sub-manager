import {
  ParsedNode,
  SubscriptionParserService,
} from './subscription-parser.service';

describe('SubscriptionParserService', () => {
  let service: SubscriptionParserService;
  let parse: (content: string) => ParsedNode[];

  beforeEach(() => {
    service = new SubscriptionParserService();
    parse = (content: string) =>
      (service as unknown as { parse(content: string): ParsedNode[] }).parse(
        content,
      );
  });

  it('parses Mihomo yaml proxies', () => {
    const [node] = parse(`
proxies:
  - name: yaml-node
    type: vmess
    server: example.com
    port: 443
    uuid: 00000000-0000-0000-0000-000000000000
    alterId: 0
    cipher: auto
`);

    expect(node).toEqual({
      name: 'yaml-node',
      type: 'vmess',
      server: 'example.com',
      port: 443,
      raw: {
        uuid: '00000000-0000-0000-0000-000000000000',
        alterId: 0,
        cipher: 'auto',
      },
    });
  });

  it('parses base64 encoded Mihomo yaml', () => {
    const yaml = `
proxies:
  - name: encoded-yaml
    type: ss
    server: example.com
    port: 8388
    cipher: aes-128-gcm
    password: pass
`;
    const [node] = parse(Buffer.from(yaml, 'utf-8').toString('base64'));

    expect(node).toMatchObject({
      name: 'encoded-yaml',
      type: 'ss',
      server: 'example.com',
      port: 8388,
      raw: { cipher: 'aes-128-gcm', password: 'pass' },
    });
  });

  it('skips invalid Mihomo yaml proxies', () => {
    const nodes = parse(`
proxies:
  - name: bad-yaml
    type: ss
    server: example.com
    port: not-a-port
    cipher: aes-128-gcm
    password: pass
  - name: good-yaml
    type: ss
    server: example.com
    port: 8388
    cipher: aes-128-gcm
    password: pass
`);

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      name: 'good-yaml',
      server: 'example.com',
      port: 8388,
    });
  });

  it('parses plain SIP002 ss uri with query params', () => {
    const [node] = parse(
      'ss://aes-128-gcm:pass@example.com:8388?plugin=obfs-local%3Bobfs%3Dhttp#plain',
    );

    expect(node).toEqual({
      name: 'plain',
      type: 'ss',
      server: 'example.com',
      port: 8388,
      raw: { cipher: 'aes-128-gcm', password: 'pass' },
    });
  });

  it('parses base64 SIP002 ss userinfo', () => {
    const userinfo = Buffer.from(
      'chacha20-ietf-poly1305:p@ss',
      'utf-8',
    ).toString('base64url');
    const [node] = parse(`ss://${userinfo}@example.com:443#encoded`);

    expect(node).toMatchObject({
      name: 'encoded',
      type: 'ss',
      server: 'example.com',
      port: 443,
      raw: { cipher: 'chacha20-ietf-poly1305', password: 'p@ss' },
    });
  });

  it('skips nodes with invalid required fields', () => {
    const nodes = parse(
      [
        'ss://aes-128-gcm:pass@example.com:not-a-port#bad',
        'ss://aes-128-gcm:pass@example.com:8388#good',
      ].join('\n'),
    );

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      name: 'good',
      server: 'example.com',
      port: 8388,
    });
  });
});
