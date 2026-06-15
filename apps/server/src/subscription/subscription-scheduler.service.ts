import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  // 每分钟巡检：刷新到达自动更新间隔的订阅
  @Cron(CronExpression.EVERY_MINUTE)
  async tick() {
    const now = Date.now();
    const sources = await this.prisma.subscriptionSource.findMany({
      where: {
        enabled: true,
        refreshInterval: { gt: 0 },
        fetchStatus: { not: 'fetching' },
      },
      select: {
        id: true,
        name: true,
        refreshInterval: true,
        lastFetchedAt: true,
      },
    });

    for (const s of sources) {
      const intervalMs = (s.refreshInterval ?? 0) * 60_000;
      const last = s.lastFetchedAt ? s.lastFetchedAt.getTime() : 0;
      if (now - last < intervalMs) continue;

      this.logger.log(`自动更新订阅「${s.name}」(${s.id})`);
      try {
        await this.subscriptions.refresh(s.id);
      } catch (err) {
        this.logger.warn(
          `自动更新订阅 ${s.id} 失败: ${(err as Error).message}`,
        );
      }
    }
  }
}
