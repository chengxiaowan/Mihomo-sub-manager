import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional } from 'class-validator';

export class BindProfileDto {
  @ApiPropertyOptional({ description: '代理组 ID 数组', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];

  @ApiPropertyOptional({ description: '规则 ID 数组', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ruleIds?: string[];
}
