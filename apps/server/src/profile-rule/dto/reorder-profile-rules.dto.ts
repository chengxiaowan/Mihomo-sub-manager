import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class ReorderProfileRulesDto {
  @ApiProperty({ description: '规则 ID 数组，按新顺序排列' })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
