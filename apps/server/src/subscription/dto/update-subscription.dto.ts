import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ example: '机场A' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/sub?token=xxx' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '自动更新间隔（分钟），0/null = 关闭' })
  @IsOptional()
  @IsInt()
  @Min(0)
  refreshInterval?: number;

  @ApiPropertyOptional({ description: '节点名排除关键字', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeKeywords?: string[];
}
