import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ example: '机场A' })
  name: string;

  @ApiProperty({ example: 'https://example.com/sub?token=xxx' })
  url: string;

  @ApiPropertyOptional({ default: true })
  enabled?: boolean;
}
