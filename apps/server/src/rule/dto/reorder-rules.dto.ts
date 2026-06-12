import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class ReorderRulesDto {
  @ApiProperty({ description: '按期望顺序排列的规则 ID 数组', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
