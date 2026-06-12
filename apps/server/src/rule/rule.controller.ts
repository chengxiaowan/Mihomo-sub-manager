import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RuleService } from './rule.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { ReorderRulesDto } from './dto/reorder-rules.dto';

@ApiTags('rules')
@Controller('rules')
export class RuleController {
  constructor(private readonly service: RuleService) {}

  @Get()
  @ApiOperation({ summary: '规则列表（按 sort 排序）' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '规则详情' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建规则' })
  create(@Body() dto: CreateRuleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新规则' })
  update(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '删除规则' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Put('reorder')
  @HttpCode(204)
  @ApiOperation({ summary: '批量排序（传入期望顺序的 ID 数组）' })
  reorder(@Body() dto: ReorderRulesDto) {
    return this.service.reorder(dto);
  }
}
