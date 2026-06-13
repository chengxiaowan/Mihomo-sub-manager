import { Module } from '@nestjs/common';
import { RuleTemplateController } from './rule-template.controller';
import { RuleTemplateService } from './rule-template.service';

@Module({
  controllers: [RuleTemplateController],
  providers: [RuleTemplateService],
})
export class RuleTemplateModule {}
