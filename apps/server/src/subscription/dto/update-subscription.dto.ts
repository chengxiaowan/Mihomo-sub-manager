import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ example: '机场A' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/sub?token=xxx' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
