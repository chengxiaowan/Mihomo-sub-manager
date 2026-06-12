import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class ManageNodesDto {
  @ApiProperty({ description: '节点 ID 数组', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  nodeIds: string[];
}
