import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProxyNodeService } from './proxy-node.service';
import { QueryProxyNodeDto } from './dto/query-proxy-node.dto';
import { UpdateProxyNodeDto } from './dto/update-proxy-node.dto';

@ApiTags('proxy-nodes')
@Controller('proxy-nodes')
export class ProxyNodeController {
  constructor(private readonly service: ProxyNodeService) {}

  @Get()
  @ApiOperation({ summary: '节点列表（支持关键词/类型/订阅源/标签过滤）' })
  findAll(@Query() query: QueryProxyNodeDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '节点详情' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新节点（启用/禁用、标签）' })
  update(@Param('id') id: string, @Body() dto: UpdateProxyNodeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '删除节点' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
