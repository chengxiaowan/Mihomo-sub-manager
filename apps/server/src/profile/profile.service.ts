import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

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

  create(dto: CreateProfileDto) {
    const token = randomBytes(24).toString('hex');
    return this.prisma.profile.create({ data: { ...dto, token } });
  }

  async update(id: string, dto: UpdateProfileDto) {
    await this.findOne(id);
    return this.prisma.profile.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.profile.delete({ where: { id } });
  }

  async regenerateToken(id: string) {
    await this.findOne(id);
    const token = randomBytes(24).toString('hex');
    return this.prisma.profile.update({ where: { id }, data: { token } });
  }

  async bindGroups(id: string, groupIds: string[]) {
    await this.findOne(id);
    return this.prisma.profile.update({
      where: { id },
      data: { groups: { set: groupIds.map((gid) => ({ id: gid })) } },
      include: { groups: true },
    });
  }
}
