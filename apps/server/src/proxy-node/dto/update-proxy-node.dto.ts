import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProxyNodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '标签数组，如 ["香港","低延迟"]' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
