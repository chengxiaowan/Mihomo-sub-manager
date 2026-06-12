import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryProxyNodeDto {
  @ApiPropertyOptional({ description: '关键词，匹配节点名称或服务器地址' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '协议类型：vmess / vless / trojan / ss' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: '订阅源 ID' })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional({ description: '标签（精确匹配单个标签）' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: '是否启用', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '页码，从 1 开始', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量，最大 200', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}
