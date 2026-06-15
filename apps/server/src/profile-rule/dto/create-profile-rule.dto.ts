import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProfileRuleDto {
  @ApiProperty({
    description:
      '规则类型：DOMAIN / DOMAIN-SUFFIX / IP-CIDR / GEOIP / MATCH 等',
  })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: '匹配值（MATCH 类型无需填写）' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiProperty({
    description: '去向：代理组名称 / DIRECT / REJECT / REJECT-DROP / PASS',
  })
  @IsString()
  policy: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
