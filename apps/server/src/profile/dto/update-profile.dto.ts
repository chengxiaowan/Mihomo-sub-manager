import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import type { BaseConfig } from '../base-config';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '兜底策略' })
  @IsOptional()
  @IsString()
  defaultPolicy?: string;

  @ApiPropertyOptional({ description: 'Mihomo 通用配置（general + dns）' })
  @IsOptional()
  @IsObject()
  baseConfig?: BaseConfig;
}
