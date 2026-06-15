import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import type { BaseConfig } from '../base-config';

export class CreateProfileDto {
  @ApiProperty({ description: '方案名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: '兜底策略，用于 MATCH 规则，默认 DIRECT',
    default: 'DIRECT',
  })
  @IsOptional()
  @IsString()
  defaultPolicy?: string;

  @ApiPropertyOptional({ description: 'Mihomo 通用配置（general + dns）' })
  @IsOptional()
  @IsObject()
  baseConfig?: BaseConfig;
}
