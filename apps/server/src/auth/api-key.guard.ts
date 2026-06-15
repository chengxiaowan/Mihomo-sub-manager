import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>('skipAuth', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const apiKey = process.env.API_KEY;
    // 未配置 API_KEY 时不启用鉴权（本地开发友好）
    if (!apiKey) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string> }>();
    if (request.headers['x-api-key'] !== apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}
