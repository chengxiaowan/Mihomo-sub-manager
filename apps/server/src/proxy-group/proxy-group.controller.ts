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
import { ProxyGroupService } from './proxy-group.service';
import { CreateProxyGroupDto } from './dto/create-proxy-group.dto';
import { UpdateProxyGroupDto } from './dto/update-proxy-group.dto';
import { ManageNodesDto } from './dto/manage-nodes.dto';

@ApiTags('proxy-groups')
@Controller('proxy-groups')
export class ProxyGroupController {
  constructor(private readonly service: ProxyGroupService) {}

  @Get()
  @ApiOperation({ summary: '代理组列表' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '代理组详情（含成员节点）' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建代理组' })
  create(@Body() dto: CreateProxyGroupDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新代理组' })
  update(@Param('id') id: string, @Body() dto: UpdateProxyGroupDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '删除代理组' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/nodes')
  @ApiOperation({ summary: '添加节点到代理组' })
  addNodes(@Param('id') id: string, @Body() dto: ManageNodesDto) {
    return this.service.addNodes(id, dto);
  }

  @Delete(':id/nodes')
  @ApiOperation({ summary: '从代理组移除节点' })
  removeNodes(@Param('id') id: string, @Body() dto: ManageNodesDto) {
    return this.service.removeNodes(id, dto);
  }

  @Put(':id/nodes')
  @ApiOperation({ summary: '全量设置代理组节点（覆盖）' })
  setNodes(@Param('id') id: string, @Body() dto: ManageNodesDto) {
    return this.service.setNodes(id, dto);
  }
}
