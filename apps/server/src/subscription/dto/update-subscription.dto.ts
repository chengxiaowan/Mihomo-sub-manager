import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ example: '机场A' })
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/sub?token=xxx' })
  url?: string;

  @ApiPropertyOptional()
  enabled?: boolean;
}
