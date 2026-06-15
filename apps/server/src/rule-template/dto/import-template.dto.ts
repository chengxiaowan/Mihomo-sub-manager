import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ImportTemplateDto {
  @ApiProperty({ description: '导入到哪个 Profile' })
  @IsString()
  profileId: string;

  @ApiProperty({ description: '规则去向：代理组名称 / DIRECT / REJECT 等' })
  @IsString()
  policy: string;

  @ApiProperty({
    description: '导入模式：append 追加 / overwrite 覆盖同策略规则',
    enum: ['append', 'overwrite'],
  })
  @IsString()
  mode: 'append' | 'overwrite';
}
