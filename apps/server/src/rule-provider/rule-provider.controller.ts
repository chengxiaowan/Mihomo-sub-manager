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
import { RuleProviderService } from './rule-provider.service';
import { CreateRuleProviderDto } from './dto/create-rule-provider.dto';
import { UpdateRuleProviderDto } from './dto/update-rule-provider.dto';

@ApiTags('rule-providers')
@Controller('rule-providers')
export class RuleProviderController {
  constructor(private readonly service: RuleProviderService) {}

  @Get()
  @ApiOperation({ summary: '规则集列表' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '规则集详情' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建规则集' })
  create(@Body() dto: CreateRuleProviderDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新规则集' })
  update(@Param('id') id: string, @Body() dto: UpdateRuleProviderDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '删除规则集' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
