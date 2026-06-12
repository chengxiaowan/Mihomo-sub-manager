import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProxyGroupDto } from './dto/create-proxy-group.dto';
import { UpdateProxyGroupDto } from './dto/update-proxy-group.dto';
import { ManageNodesDto } from './dto/manage-nodes.dto';

@Injectable()
export class ProxyGroupService {
  constructor(private readonly prisma: PrismaService) {}

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

  create(dto: CreateProxyGroupDto) {
    return this.prisma.proxyGroup.create({ data: dto });
  }

  async update(id: string, dto: UpdateProxyGroupDto) {
    await this.findOne(id);
    return this.prisma.proxyGroup.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.proxyGroup.delete({ where: { id } });
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
    await this.findOne(id);
    return this.prisma.proxyGroup.update({
      where: { id },
      data: {
        nodes: { set: dto.nodeIds.map((nodeId) => ({ id: nodeId })) },
      },
      include: { _count: { select: { nodes: true } } },
    });
  }
}
