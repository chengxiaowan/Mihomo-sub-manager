import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CreateProxyGroupDto } from './dto/create-proxy-group.dto';
import { UpdateProxyGroupDto } from './dto/update-proxy-group.dto';
import { ManageNodesDto } from './dto/manage-nodes.dto';

@Injectable()
export class ProxyGroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly opLog: OperationLogService,
  ) {}

  findAll() {
    return this.prisma.proxyGroup.findMany({
      orderBy: { sort: 'asc' },
      include: { _count: { select: { nodes: true } } },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.proxyGroup.findUnique({
      where: { id },
      include: { nodes: true },
    });
    if (!group) throw new NotFoundException(`ProxyGroup ${id} not found`);
    return group;
  }

  async create(dto: CreateProxyGroupDto) {
    const group = await this.prisma.proxyGroup.create({ data: dto });
    this.opLog.record({
      action: 'proxy-group.create',
      entityType: 'ProxyGroup',
      entityId: group.id,
      status: 'success',
      message: `创建代理组「${group.name}」`,
    });
    return group;
  }

  async update(id: string, dto: UpdateProxyGroupDto) {
    await this.findOne(id);
    const group = await this.prisma.proxyGroup.update({
      where: { id },
      data: dto,
    });
    this.opLog.record({
      action: 'proxy-group.update',
      entityType: 'ProxyGroup',
      entityId: id,
      status: 'success',
      message: `更新代理组「${group.name}」`,
    });
    return group;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    const group = await this.prisma.proxyGroup.delete({ where: { id } });
    this.opLog.record({
      action: 'proxy-group.remove',
      entityType: 'ProxyGroup',
      entityId: id,
      status: 'success',
      message: `删除代理组「${existing.name}」`,
    });
    return group;
  }

  async addNodes(id: string, dto: ManageNodesDto) {
    await this.findOne(id);
    return this.prisma.proxyGroup.update({
      where: { id },
      data: {
        nodes: { connect: dto.nodeIds.map((nodeId) => ({ id: nodeId })) },
      },
      include: { _count: { select: { nodes: true } } },
    });
  }

  async removeNodes(id: string, dto: ManageNodesDto) {
    await this.findOne(id);
    return this.prisma.proxyGroup.update({
      where: { id },
      data: {
        nodes: { disconnect: dto.nodeIds.map((nodeId) => ({ id: nodeId })) },
      },
      include: { _count: { select: { nodes: true } } },
    });
  }

  async setNodes(id: string, dto: ManageNodesDto) {
    const existing = await this.findOne(id);
    const group = await this.prisma.proxyGroup.update({
      where: { id },
      data: {
        nodes: { set: dto.nodeIds.map((nodeId) => ({ id: nodeId })) },
      },
      include: { _count: { select: { nodes: true } } },
    });
    this.opLog.record({
      action: 'proxy-group.set-nodes',
      entityType: 'ProxyGroup',
      entityId: id,
      status: 'success',
      message: `更新代理组「${existing.name}」成员节点，共 ${dto.nodeIds.length} 个`,
      detail: { nodeCount: dto.nodeIds.length },
    });
    return group;
  }
}
