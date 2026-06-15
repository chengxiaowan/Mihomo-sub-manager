import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(OperationLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  write(opts: LogOptions) {
    return this.prisma.operationLog.create({
      data: { ...opts, detail: opts.detail as never },
    });
  }

  /**
   * Fire-and-forget 写入：日志失败不影响主流程，仅告警。
   * 调用方无需自行 .catch()。
   */
  record(opts: LogOptions): void {
    this.write(opts).catch((err: unknown) =>
      this.logger.warn(`写入操作日志失败: ${(err as Error).message}`),
    );
  }

  findAll(limit = 100) {
    return this.prisma.operationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
