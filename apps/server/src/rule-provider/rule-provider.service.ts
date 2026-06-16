import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CreateRuleProviderDto } from './dto/create-rule-provider.dto';
import { UpdateRuleProviderDto } from './dto/update-rule-provider.dto';

@Injectable()
export class RuleProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly opLog: OperationLogService,
  ) {}

  async findAll() {
    const rows = await this.prisma.ruleProvider.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.present(r));
  }

  async findOne(id: string) {
    return this.present(await this.getRaw(id));
  }

  private async getRaw(id: string) {
    const row = await this.prisma.ruleProvider.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`RuleProvider ${id} not found`);
    return row;
  }

  async create(dto: CreateRuleProviderDto) {
    this.assertTypeFields(dto.type, dto.url, dto.format, dto.behavior);
    const { payload, ...rest } = dto;
    const row = await this.prisma.ruleProvider.create({
      data: {
        ...rest,
        ...(payload !== undefined ? { payload: JSON.stringify(payload) } : {}),
      },
    });
    this.opLog.record({
      action: 'rule-provider.create',
      entityType: 'RuleProvider',
      entityId: row.id,
      status: 'success',
      message: `创建规则集「${row.name}」`,
    });
    return this.present(row);
  }

  async update(id: string, dto: UpdateRuleProviderDto) {
    const existing = await this.getRaw(id);
    const type = dto.type ?? existing.type;
    const url = dto.url ?? existing.url ?? undefined;
    const format = dto.format ?? existing.format;
    const behavior = dto.behavior ?? existing.behavior;
    this.assertTypeFields(type, url, format, behavior);
    const { payload, ...rest } = dto;
    const row = await this.prisma.ruleProvider.update({
      where: { id },
      data: {
        ...rest,
        ...(payload !== undefined ? { payload: JSON.stringify(payload) } : {}),
      },
    });
    this.opLog.record({
      action: 'rule-provider.update',
      entityType: 'RuleProvider',
      entityId: id,
      status: 'success',
      message: `更新规则集「${row.name}」`,
    });
    return this.present(row);
  }

  async remove(id: string) {
    const existing = await this.getRaw(id);
    const row = await this.prisma.ruleProvider.delete({ where: { id } });
    this.opLog.record({
      action: 'rule-provider.remove',
      entityType: 'RuleProvider',
      entityId: id,
      status: 'success',
      message: `删除规则集「${existing.name}」`,
    });
    return this.present(row);
  }

  private assertTypeFields(
    type: string,
    url?: string,
    format?: string,
    behavior?: string,
  ) {
    if (type === 'http' && !url) {
      throw new BadRequestException('http 类型规则集必须提供 url');
    }
    if (format === 'mrs' && behavior === 'classical') {
      throw new BadRequestException('mrs 格式仅支持 domain / ipcidr 行为');
    }
  }

  private parsePayload(raw: string): string[] {
    try {
      const arr: unknown = JSON.parse(raw);
      return Array.isArray(arr)
        ? arr.filter((x): x is string => typeof x === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private present<T extends { payload: string }>(row: T) {
    return { ...row, payload: this.parsePayload(row.payload) };
  }
}
