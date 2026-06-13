import { Module } from '@nestjs/common';
import { ProfileRuleController } from './profile-rule.controller';
import { ProfileRuleService } from './profile-rule.service';

@Module({
  controllers: [ProfileRuleController],
  providers: [ProfileRuleService],
})
export class ProfileRuleModule {}
