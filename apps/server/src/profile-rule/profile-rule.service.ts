import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileRuleDto } from './dto/create-profile-rule.dto';
import { ReorderProfileRulesDto } from './dto/reorder-profile-rules.dto';

@Injectable()
export class ProfileRuleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(profileId: string) {
    return this.prisma.profileRule.findMany({
      where: { profileId },
      orderBy: { sort: 'asc' },
    });
  }

  async create(profileId: string, dto: CreateProfileRuleDto) {
    const last = await this.prisma.profileRule.findFirst({
      where: { profileId },
      orderBy: { sort: 'desc' },
    });
    return this.prisma.profileRule.create({
      data: {
        ...dto,
        sort: dto.sort ?? (last ? last.sort + 1 : 0),
        profileId,
      },
    });
  }

  async update(profileId: string, id: string, dto: Partial<CreateProfileRuleDto>) {
    await this.findOne(profileId, id);
    return this.prisma.profileRule.update({ where: { id }, data: dto });
  }

  async remove(profileId: string, id: string) {
    await this.findOne(profileId, id);
    return this.prisma.profileRule.delete({ where: { id } });
  }

  async reorder(profileId: string, dto: ReorderProfileRulesDto) {
    const owned = await this.prisma.profileRule.findMany({
      where: { profileId, id: { in: dto.ids } },
      select: { id: true },
    });
    if (owned.length !== dto.ids.length) {
      throw new BadRequestException('存在不属于当前方案的规则 ID');
    }
    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.profileRule.update({ where: { id }, data: { sort: index } }),
      ),
    );
  }

  private async findOne(profileId: string, id: string) {
    const rule = await this.prisma.profileRule.findFirst({ where: { id, profileId } });
    if (!rule) throw new NotFoundException(`Rule ${id} not found in profile ${profileId}`);
    return rule;
  }
}
