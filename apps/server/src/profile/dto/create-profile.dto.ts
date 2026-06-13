import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateProfileDto {
  @ApiProperty({ description: '方案名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '兜底策略，用于 MATCH 规则，默认 DIRECT', default: 'DIRECT' })
  @IsOptional()
  @IsString()
  defaultPolicy?: string;
}
