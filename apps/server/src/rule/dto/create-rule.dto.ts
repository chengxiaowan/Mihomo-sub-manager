import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRuleDto {
  @ApiProperty({ description: 'DOMAIN / DOMAIN-SUFFIX / IP-CIDR / GEOIP / MATCH / …' })
  @IsString()
  type: string;

  @ApiProperty({ description: '匹配值，MATCH 类型留空字符串' })
  @IsString()
  value: string;

  @ApiProperty({ description: '策略，如 PROXY / DIRECT / REJECT 或代理组名称' })
  @IsString()
  policy: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '排序值，越小越靠前', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}
