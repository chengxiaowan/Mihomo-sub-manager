import { Module } from '@nestjs/common';
import { RuleProviderController } from './rule-provider.controller';
import { RuleProviderService } from './rule-provider.service';

@Module({
  controllers: [RuleProviderController],
  providers: [RuleProviderService],
  exports: [RuleProviderService],
})
export class RuleProviderModule {}
