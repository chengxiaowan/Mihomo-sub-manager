import { Module } from '@nestjs/common';
import { ProxyGroupController } from './proxy-group.controller';
import { ProxyGroupService } from './proxy-group.service';

@Module({
  controllers: [ProxyGroupController],
  providers: [ProxyGroupService],
  exports: [ProxyGroupService],
})
export class ProxyGroupModule {}
