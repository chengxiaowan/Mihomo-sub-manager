import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GeneratorService } from './generator.service';

@ApiTags('profiles')
@Controller('profiles')
export class GeneratorController {
  constructor(private readonly generator: GeneratorService) {}

  @Get(':id/validate')
  @ApiOperation({ summary: '校验配置方案是否可发布（errors/warnings）' })
  validate(@Param('id') id: string) {
    return this.generator.validateById(id);
  }
}
