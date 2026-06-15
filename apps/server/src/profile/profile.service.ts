import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { normalizeBaseConfig } from './base-config';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly opLog: OperationLogService,
  ) {}

  findAll() {
    return this.prisma.profile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { groups: true, rules: true } },
      },
    });
  }

  async findOne(id: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      include: { groups: true },
    });
    if (!profile) throw new NotFoundException(`Profile ${id} not found`);
    return profile;
  }

  async findByToken(token: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { token, enabled: true },
      include: {
        groups: {
          where: { enabled: true },
          orderBy: { sort: 'asc' },
          include: { nodes: { where: { enabled: true } } },
        },
        rules: { where: { enabled: true }, orderBy: { sort: 'asc' } },
      },
    });
    if (!profile) throw new NotFoundException(`Profile not found`);
    return profile;
  }

  async create(dto: CreateProfileDto) {
    const token = randomBytes(24).toString('hex');
    const { baseConfig, ...rest } = dto;
    const profile = await this.prisma.profile.create({
      data: {
        ...rest,
        token,
        baseConfig: normalizeBaseConfig(baseConfig) as never,
      },
    });
    this.opLog.record({
      action: 'profile.create',
      entityType: 'Profile',
      entityId: profile.id,
      status: 'success',
      message: `创建配置方案「${profile.name}」`,
    });
    return profile;
  }

  async update(id: string, dto: UpdateProfileDto) {
    await this.findOne(id);
    const { baseConfig, ...rest } = dto;
    const profile = await this.prisma.profile.update({
      where: { id },
      data: {
        ...rest,
        ...(baseConfig !== undefined
          ? { baseConfig: normalizeBaseConfig(baseConfig) as never }
          : {}),
      },
    });
    this.opLog.record({
      action: 'profile.update',
      entityType: 'Profile',
      entityId: id,
      status: 'success',
      message: `更新配置方案「${profile.name}」`,
    });
    return profile;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    const profile = await this.prisma.profile.delete({ where: { id } });
    this.opLog.record({
      action: 'profile.remove',
      entityType: 'Profile',
      entityId: id,
      status: 'success',
      message: `删除配置方案「${existing.name}」`,
    });
    return profile;
  }

  async regenerateToken(id: string) {
    const existing = await this.findOne(id);
    const token = randomBytes(24).toString('hex');
    const profile = await this.prisma.profile.update({
      where: { id },
      data: { token },
    });
    this.opLog.record({
      action: 'profile.regenerate-token',
      entityType: 'Profile',
      entityId: id,
      status: 'success',
      message: `重置配置方案「${existing.name}」的订阅令牌`,
    });
    return profile;
  }

  async bindGroups(id: string, groupIds: string[]) {
    const existing = await this.findOne(id);
    const profile = await this.prisma.profile.update({
      where: { id },
      data: { groups: { set: groupIds.map((gid) => ({ id: gid })) } },
      include: { groups: true },
    });
    this.opLog.record({
      action: 'profile.bind-groups',
      entityType: 'Profile',
      entityId: id,
      status: 'success',
      message: `更新配置方案「${existing.name}」绑定的代理组，共 ${groupIds.length} 个`,
      detail: { groupCount: groupIds.length },
    });
    return profile;
  }
}
