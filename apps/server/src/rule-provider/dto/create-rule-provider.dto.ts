import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateRuleProviderDto {
  @ApiProperty({ description: '引用名（用于 RULE-SET,<name>）' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'http / inline' })
  @IsIn(['http', 'inline'])
  type: string;

  @ApiProperty({ description: 'domain / ipcidr / classical' })
  @IsIn(['domain', 'ipcidr', 'classical'])
  behavior: string;

  @ApiPropertyOptional({ description: 'yaml / text / mrs', default: 'yaml' })
  @IsOptional()
  @IsIn(['yaml', 'text', 'mrs'])
  format?: string;

  @ApiPropertyOptional({ description: 'http 时必填' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: '本地/缓存路径，http 不填则自动生成' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: '更新间隔（秒）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  interval?: number;

  @ApiPropertyOptional({ description: '经由某代理组下载' })
  @IsOptional()
  @IsString()
  proxy?: string;

  @ApiPropertyOptional({ description: 'inline 规则数组', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  payload?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
