import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GeneratorService } from '../generator/generator.service';

@ApiTags('publish')
@Controller('publish')
export class PublishController {
  constructor(private readonly generator: GeneratorService) {}

  @Get(':token.yaml')
  @ApiOperation({ summary: '按 token 返回 Mihomo 订阅 YAML' })
  async publish(@Param('token') token: string, @Res() res: Response) {
    let yaml: string;
    try {
      yaml = await this.generator.generateYaml(token);
    } catch (e) {
      if ((e as { status?: number }).status === 404) {
        throw new NotFoundException('订阅不存在或已停用');
      }
      throw e;
    }

    res
      .set({
        'Content-Type': 'text/yaml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${token}.yaml"`,
      })
      .send(yaml);
  }
}
