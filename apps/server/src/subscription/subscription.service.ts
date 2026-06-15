import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { SubscriptionParserService } from './subscription-parser.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: SubscriptionParserService,
    private readonly opLog: OperationLogService,
  ) {}

  async findAll() {
    const rows = await this.prisma.subscriptionSource.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.present(r));
  }

  async findOne(id: string) {
    return this.present(await this.getRaw(id));
  }

  // 内部使用：返回原始行（excludeKeywords 为 JSON 字符串）
  private async getRaw(id: string) {
    const source = await this.prisma.subscriptionSource.findUnique({
      where: { id },
    });
    if (!source) throw new NotFoundException(`Subscription ${id} not found`);
    return source;
  }

  async create(dto: CreateSubscriptionDto) {
    const { excludeKeywords, ...rest } = dto;
    const source = await this.prisma.subscriptionSource.create({
      data: {
        ...rest,
        ...(excludeKeywords !== undefined
          ? { excludeKeywords: JSON.stringify(excludeKeywords) }
          : {}),
      },
    });
    this.opLog.record({
      action: 'subscription.create',
      entityType: 'SubscriptionSource',
      entityId: source.id,
      status: 'success',
      message: `添加订阅源「${source.name}」`,
    });
    // 添加后自动拉取一次（异步，不阻塞创建响应）
    if (source.enabled) {
      this.refresh(source.id).catch((err: unknown) =>
        this.logger.warn(
          `自动拉取订阅 ${source.id} 失败: ${(err as Error).message}`,
        ),
      );
    }
    return this.present(source);
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    await this.getRaw(id);
    const { excludeKeywords, ...rest } = dto;
    const source = await this.prisma.subscriptionSource.update({
      where: { id },
      data: {
        ...rest,
        ...(excludeKeywords !== undefined
          ? { excludeKeywords: JSON.stringify(excludeKeywords) }
          : {}),
      },
    });
    this.opLog.record({
      action: 'subscription.update',
      entityType: 'SubscriptionSource',
      entityId: id,
      status: 'success',
      message: `更新订阅源「${source.name}」`,
    });
    return this.present(source);
  }

  async remove(id: string) {
    const existing = await this.getRaw(id);
    const source = await this.prisma.$transaction(async (tx) => {
      await tx.proxyNode.deleteMany({ where: { sourceId: id } });
      return tx.subscriptionSource.delete({ where: { id } });
    });
    this.opLog.record({
      action: 'subscription.remove',
      entityType: 'SubscriptionSource',
      entityId: id,
      status: 'success',
      message: `删除订阅源「${existing.name}」`,
    });
    return this.present(source);
  }

  async refresh(id: string) {
    const source = await this.getRaw(id);

    await this.prisma.subscriptionSource.update({
      where: { id },
      data: { fetchStatus: 'fetching' },
    });

    try {
      const parsed = await this.parser.fetchAndParse(source.url);
      // 按关键字排除伪节点（到期时间 / 剩余流量 / 官网 等）
      const keywords = this.parseKeywords(source.excludeKeywords);
      const nodes = keywords.length
        ? parsed.filter((n) => !keywords.some((kw) => n.name.includes(kw)))
        : parsed;
      const excludedCount = parsed.length - nodes.length;

      if (nodes.length === 0) {
        this.logger.warn(`订阅 ${id} 解析结果为空`);
        await this.prisma.subscriptionSource.update({
          where: { id },
          data: { fetchStatus: 'success', lastFetchedAt: new Date() },
        });
        this.opLog.record({
          action: 'subscription.refresh',
          entityType: 'SubscriptionSource',
          entityId: id,
          status: 'info',
          message: `刷新订阅「${source.name}」：解析结果为空`,
          detail: { nodesAdded: 0, excluded: excludedCount },
        });
        return { nodesAdded: 0 };
      }

      await this.prisma.$transaction(async (tx) => {
        const oldNodes = await tx.proxyNode.findMany({
          where: { sourceId: id },
          select: {
            name: true,
            type: true,
            server: true,
            port: true,
            groups: { select: { id: true } },
          },
        });
        const groupsByNode = new Map<string, Set<string>>();
        for (const node of oldNodes) {
          groupsByNode.set(
            this.nodeKey(node),
            new Set(node.groups.map((group) => group.id)),
          );
        }

        // 删除该订阅源的旧节点，重新写入；事务失败时旧节点会回滚。
        await tx.proxyNode.deleteMany({ where: { sourceId: id } });
        for (const node of nodes) {
          const groupIds = [...(groupsByNode.get(this.nodeKey(node)) ?? [])];
          await tx.proxyNode.create({
            data: {
              name: node.name,
              type: node.type,
              server: node.server,
              port: node.port,
              raw: node.raw as never,
              sourceId: id,
              ...(groupIds.length
                ? {
                    groups: {
                      connect: groupIds.map((groupId) => ({ id: groupId })),
                    },
                  }
                : {}),
            },
          });
        }

        await tx.subscriptionSource.update({
          where: { id },
          data: { fetchStatus: 'success', lastFetchedAt: new Date() },
        });
      });

      this.opLog.record({
        action: 'subscription.refresh',
        entityType: 'SubscriptionSource',
        entityId: id,
        status: 'success',
        message: `刷新订阅「${source.name}」成功，新增 ${nodes.length} 个节点${
          excludedCount ? `（排除 ${excludedCount} 个）` : ''
        }`,
        detail: { nodesAdded: nodes.length, excluded: excludedCount },
      });
      return { nodesAdded: nodes.length };
    } catch (e) {
      await this.prisma.subscriptionSource.update({
        where: { id },
        data: { fetchStatus: 'error', lastFetchedAt: new Date() },
      });
      this.opLog.record({
        action: 'subscription.refresh',
        entityType: 'SubscriptionSource',
        entityId: id,
        status: 'error',
        message: `刷新订阅「${source.name}」失败`,
        detail: { error: (e as Error).message },
      });
      throw e;
    }
  }

  private parseKeywords(raw: string): string[] {
    try {
      const arr: unknown = JSON.parse(raw);
      return Array.isArray(arr)
        ? arr.filter(
            (x): x is string => typeof x === 'string' && x.trim() !== '',
          )
        : [];
    } catch {
      return [];
    }
  }

  // 对外响应：把 excludeKeywords JSON 字符串转成数组
  private present<T extends { excludeKeywords: string }>(row: T) {
    return { ...row, excludeKeywords: this.parseKeywords(row.excludeKeywords) };
  }

  private nodeKey(node: {
    name: string;
    type: string;
    server: string;
    port: number | null;
  }) {
    return [node.type, node.server, node.port ?? '', node.name].join('\0');
  }
}
