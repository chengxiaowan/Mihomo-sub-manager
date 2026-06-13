import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleTemplateDto } from './dto/create-rule-template.dto';
import { ImportTemplateDto } from './dto/import-template.dto';

@Injectable()
export class RuleTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.ruleTemplate.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.ruleTemplate.findUnique({
      where: { id },
      include: { items: { orderBy: { sort: 'asc' } } },
    });
    if (!t) throw new NotFoundException(`RuleTemplate ${id} not found`);
    return t;
  }

  async create(dto: CreateRuleTemplateDto) {
    return this.prisma.ruleTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        items: dto.items
          ? { create: dto.items.map((item, i) => ({ ...item, sort: i })) }
          : undefined,
      },
      include: { items: { orderBy: { sort: 'asc' } } },
    });
  }

  async update(id: string, dto: Partial<CreateRuleTemplateDto>) {
    await this.findOne(id);
    const { items, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (items !== undefined) {
        await tx.ruleTemplateItem.deleteMany({ where: { templateId: id } });
        await tx.ruleTemplateItem.createMany({
          data: items.map((item, i) => ({ ...item, sort: i, templateId: id })),
        });
      }

      return tx.ruleTemplate.update({
        where: { id },
        data: rest,
        include: { items: { orderBy: { sort: 'asc' } } },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.ruleTemplate.delete({ where: { id } });
  }

  async importToProfile(id: string, dto: ImportTemplateDto) {
    const template = await this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
      if (dto.mode === 'overwrite') {
        await tx.profileRule.deleteMany({
          where: { profileId: dto.profileId, policy: dto.policy },
        });
      }

      const last = await tx.profileRule.findFirst({
        where: { profileId: dto.profileId },
        orderBy: { sort: 'desc' },
      });
      const baseSort = last ? last.sort + 1 : 0;

      await tx.profileRule.createMany({
        data: template.items.map((item, i) => ({
          type: item.type,
          value: item.value ?? null,
          policy: dto.policy,
          sort: baseSort + i,
          profileId: dto.profileId,
        })),
      });
    });

    return { imported: template.items.length };
  }
}
