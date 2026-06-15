import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RuleTemplateService } from './rule-template.service';
import { CreateRuleTemplateDto } from './dto/create-rule-template.dto';
import { ImportTemplateDto } from './dto/import-template.dto';

@ApiTags('rule-templates')
@Controller('rule-templates')
export class RuleTemplateController {
  constructor(private readonly service: RuleTemplateService) {}

  @Get()
  @ApiOperation({ summary: '规则模板列表' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '规则模板详情（含条目）' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建规则模板' })
  create(@Body() dto: CreateRuleTemplateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新规则模板' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateRuleTemplateDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '删除规则模板' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/import')
  @ApiOperation({ summary: '导入模板到 Profile（追加/覆盖）' })
  importToProfile(@Param('id') id: string, @Body() dto: ImportTemplateDto) {
    return this.service.importToProfile(id, dto);
  }
}
