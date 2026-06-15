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
}
