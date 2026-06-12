import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { ReorderRulesDto } from './dto/reorder-rules.dto';

@Injectable()
export class RuleService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.rule.findMany({ orderBy: { sort: 'asc' } });
  }

  async findOne(id: string) {
    const rule = await this.prisma.rule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException(`Rule ${id} not found`);
    return rule;
  }

  async create(dto: CreateRuleDto) {
    const maxSort = await this.prisma.rule.aggregate({ _max: { sort: true } });
    const sort = dto.sort ?? (maxSort._max.sort ?? -1) + 1;
    return this.prisma.rule.create({ data: { ...dto, sort } });
  }

  async update(id: string, dto: UpdateRuleDto) {
    await this.findOne(id);
    return this.prisma.rule.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.rule.delete({ where: { id } });
  }

  async reorder(dto: ReorderRulesDto) {
    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.rule.update({ where: { id }, data: { sort: index } }),
      ),
    );
  }
}
