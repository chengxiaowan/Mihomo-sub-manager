import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipAuth } from './auth/skip-auth.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  @SkipAuth()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
