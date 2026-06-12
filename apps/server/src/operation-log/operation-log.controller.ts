import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OperationLogService } from './operation-log.service';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

@ApiTags('operation-logs')
@Controller('operation-logs')
export class OperationLogController {
  constructor(private readonly service: OperationLogService) {}

  @Get()
  @ApiOperation({ summary: '获取操作日志列表' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const take = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    return this.service.findAll(take);
  }
}
