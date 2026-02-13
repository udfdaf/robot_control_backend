import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { headers: Record<string, string | undefined> }>();
    const headerKey = req.headers['x-admin-key'];
    const adminKey = this.config.get<string>('ADMIN_API_KEY');

    if (!adminKey) {
      throw new UnauthorizedException('ADMIN_API_KEY is not configured');
    }
    if (!headerKey || headerKey !== adminKey) {
      throw new UnauthorizedException('Invalid admin key');
    }
    return true;
  }
}
