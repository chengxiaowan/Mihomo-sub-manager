import { Module } from '@nestjs/common';
import { ProxyNodeController } from './proxy-node.controller';
import { ProxyNodeService } from './proxy-node.service';

@Module({
  controllers: [ProxyNodeController],
  providers: [ProxyNodeService],
  exports: [ProxyNodeService],
})
export class ProxyNodeModule {}
