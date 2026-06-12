import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type LogStatus = 'success' | 'error' | 'info';

export interface LogOptions {
  action: string;
  entityType?: string;
  entityId?: string;
  status: LogStatus;
  message?: string;
  detail?: Record<string, unknown>;
}

@Injectable()
export class OperationLogService {
  constructor(private readonly prisma: PrismaService) {}

  write(opts: LogOptions) {
    return this.prisma.operationLog.create({
      data: { ...opts, detail: opts.detail as never },
    });
  }

  findAll(limit = 100) {
    return this.prisma.operationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
