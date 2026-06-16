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
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('profiles')
@Controller('profiles')
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Get()
  @ApiOperation({ summary: '配置方案列表' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '配置方案详情（含绑定代理组）' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建配置方案（自动生成 token）' })
  create(@Body() dto: CreateProfileDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新配置方案' })
  update(@Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '删除配置方案' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/token/regenerate')
  @ApiOperation({ summary: '重新生成发布 token' })
  regenerateToken(@Param('id') id: string) {
    return this.service.regenerateToken(id);
  }

  @Put(':id/groups')
  @ApiOperation({ summary: '绑定代理组（全量覆盖）' })
  bindGroups(@Param('id') id: string, @Body() body: { groupIds: string[] }) {
    return this.service.bindGroups(id, body.groupIds);
  }

  @Put(':id/providers')
  @ApiOperation({ summary: '绑定规则集（全量覆盖）' })
  bindProviders(
    @Param('id') id: string,
    @Body() body: { providerIds: string[] },
  ) {
    return this.service.bindProviders(id, body.providerIds);
  }
}
