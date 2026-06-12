import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProxyNodeDto } from './dto/query-proxy-node.dto';
import { UpdateProxyNodeDto } from './dto/update-proxy-node.dto';

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

@Injectable()
export class ProxyNodeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProxyNodeDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(
      Math.max(Number(query.pageSize) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );

    const where = this.buildWhere(query);
    const [total, items] = await Promise.all([
      this.prisma.proxyNode.count({ where }),
      this.prisma.proxyNode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { source: { select: { id: true, name: true } } },
      }),
    ]);

    return { total, page, pageSize, items };
  }

  async findOne(id: string) {
    const node = await this.prisma.proxyNode.findUnique({
      where: { id },
      include: { source: { select: { id: true, name: true } } },
    });
    if (!node) throw new NotFoundException(`ProxyNode ${id} not found`);
    return node;
  }

  async update(id: string, dto: UpdateProxyNodeDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.enabled !== undefined) data['enabled'] = dto.enabled;
    if (dto.tags !== undefined) data['tags'] = JSON.stringify(dto.tags);
    return this.prisma.proxyNode.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.proxyNode.delete({ where: { id } });
  }

  async removeBySource(sourceId: string) {
    return this.prisma.proxyNode.deleteMany({ where: { sourceId } });
  }

  private buildWhere(query: QueryProxyNodeDto) {
    const where: Record<string, unknown> = {};

    if (query.keyword) {
      where['OR'] = [
        { name: { contains: query.keyword } },
        { server: { contains: query.keyword } },
      ];
    }
    if (query.type) where['type'] = query.type;
    if (query.sourceId) where['sourceId'] = query.sourceId;
    if (query.enabled !== undefined) {
      where['enabled'] = String(query.enabled) === 'true';
    }
    if (query.tag) {
      // tags 存为 JSON 字符串，用 contains 做模糊匹配
      where['tags'] = { contains: `"${query.tag}"` };
    }

    return where;
  }
}
