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

  findAll() {
    return this.prisma.subscriptionSource.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const source = await this.prisma.subscriptionSource.findUnique({
      where: { id },
    });
    if (!source) throw new NotFoundException(`Subscription ${id} not found`);
    return source;
  }

  async create(dto: CreateSubscriptionDto) {
    const source = await this.prisma.subscriptionSource.create({ data: dto });
    this.opLog
      .write({
        action: 'subscription.create',
        entityType: 'SubscriptionSource',
        entityId: source.id,
        status: 'success',
        message: `添加订阅源「${source.name}」`,
      })
      .catch((err: unknown) =>
        this.logger.warn('写入操作日志失败', (err as Error).message),
      );
    return source;
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    await this.findOne(id);
    const source = await this.prisma.subscriptionSource.update({
      where: { id },
      data: dto,
    });
    this.opLog.record({
      action: 'subscription.update',
      entityType: 'SubscriptionSource',
      entityId: id,
      status: 'success',
      message: `更新订阅源「${source.name}」`,
    });
    return source;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    const source = await this.prisma.subscriptionSource.delete({
      where: { id },
    });
    this.opLog.record({
      action: 'subscription.remove',
      entityType: 'SubscriptionSource',
      entityId: id,
      status: 'success',
      message: `删除订阅源「${existing.name}」`,
    });
    return source;
  }

  async refresh(id: string) {
    const source = await this.findOne(id);

    await this.prisma.subscriptionSource.update({
      where: { id },
      data: { fetchStatus: 'fetching' },
    });

    try {
      const nodes = await this.parser.fetchAndParse(source.url);
      if (nodes.length === 0) {
        this.logger.warn(`订阅 ${id} 解析结果为空`);
        await this.prisma.subscriptionSource.update({
          where: { id },
          data: { fetchStatus: 'success', lastFetchedAt: new Date() },
        });
        this.opLog
          .write({
            action: 'subscription.refresh',
            entityType: 'SubscriptionSource',
            entityId: id,
            status: 'info',
            message: `刷新订阅「${source.name}」：解析结果为空`,
            detail: { nodesAdded: 0 },
          })
          .catch((err: unknown) =>
            this.logger.warn('写入操作日志失败', (err as Error).message),
          );
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

      this.opLog
        .write({
          action: 'subscription.refresh',
          entityType: 'SubscriptionSource',
          entityId: id,
          status: 'success',
          message: `刷新订阅「${source.name}」成功，新增 ${nodes.length} 个节点`,
          detail: { nodesAdded: nodes.length },
        })
        .catch((err: unknown) =>
          this.logger.warn('写入操作日志失败', (err as Error).message),
        );
      return { nodesAdded: nodes.length };
    } catch (e) {
      await this.prisma.subscriptionSource.update({
        where: { id },
        data: { fetchStatus: 'error', lastFetchedAt: new Date() },
      });
      this.opLog
        .write({
          action: 'subscription.refresh',
          entityType: 'SubscriptionSource',
          entityId: id,
          status: 'error',
          message: `刷新订阅「${source.name}」失败`,
          detail: { error: (e as Error).message },
        })
        .catch((err: unknown) =>
          this.logger.warn('写入操作日志失败', (err as Error).message),
        );
      throw e;
    }
  }

  private nodeKey(node: {
    name: string;
    type: string;
    server: string;
    port: number | null;
  }) {
    return [node.type, node.server, node.port ?? '', node.name].join('\u0000');
  }
}
