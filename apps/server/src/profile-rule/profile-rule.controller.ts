import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProfileRuleService } from './profile-rule.service';
import { CreateProfileRuleDto } from './dto/create-profile-rule.dto';
import { ReorderProfileRulesDto } from './dto/reorder-profile-rules.dto';

@ApiTags('profile-rules')
@Controller('profiles/:profileId/rules')
export class ProfileRuleController {
  constructor(private readonly service: ProfileRuleService) {}

  @Get()
  @ApiOperation({ summary: '获取 Profile 的规则列表' })
  findAll(@Param('profileId') profileId: string) {
    return this.service.findAll(profileId);
  }

  @Post()
  @ApiOperation({ summary: '添加规则' })
  create(@Param('profileId') profileId: string, @Body() dto: CreateProfileRuleDto) {
    return this.service.create(profileId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新规则' })
  update(
    @Param('profileId') profileId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateProfileRuleDto>,
  ) {
    return this.service.update(profileId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: '删除规则' })
  remove(@Param('profileId') profileId: string, @Param('id') id: string) {
    return this.service.remove(profileId, id);
  }

  @Put('reorder')
  @ApiOperation({ summary: '重新排序规则' })
  reorder(@Param('profileId') profileId: string, @Body() dto: ReorderProfileRulesDto) {
    return this.service.reorder(profileId, dto);
  }
}
