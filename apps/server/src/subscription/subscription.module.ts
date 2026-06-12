import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionParserService } from './subscription-parser.service';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionParserService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
