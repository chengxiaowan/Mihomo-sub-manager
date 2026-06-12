import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: '机场A' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://example.com/sub?token=xxx' })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
