import { PartialType } from '@nestjs/swagger';
import { CreateRuleProviderDto } from './create-rule-provider.dto';

export class UpdateRuleProviderDto extends PartialType(CreateRuleProviderDto) {}
