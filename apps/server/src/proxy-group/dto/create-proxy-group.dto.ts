import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProxyGroupDto {
  @ApiProperty({ description: '代理组名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'select / url-test / fallback / load-balance' })
  @IsIn(['select', 'url-test', 'fallback', 'load-balance'])
  type: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @ApiPropertyOptional({
    description: '测速地址（url-test/fallback/load-balance）',
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: '测速间隔（秒）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  interval?: number;

  @ApiPropertyOptional({ description: '容差（毫秒，仅 url-test）' })
  @IsOptional()
  @IsInt()
  @Min(0)
  tolerance?: number;

  @ApiPropertyOptional({ description: '惰性测速（仅使用时测）' })
  @IsOptional()
  @IsBoolean()
  lazy?: boolean;

  @ApiPropertyOptional({ description: '正则过滤代理' })
  @IsOptional()
  @IsString()
  filter?: string;
}
