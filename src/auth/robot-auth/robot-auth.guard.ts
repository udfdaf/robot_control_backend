import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RobotsService } from '../../robots/robots.service';
import { Request } from 'express'; 
import * as crypto from 'crypto';

@Injectable()
export class RobotAuthGuard implements CanActivate {
  constructor(private readonly robotsService: RobotsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('API key is missing');
    }

    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const robot = await this.robotsService.findByApiKeyHash(hash);

    if (!robot) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.robot = robot; // 요청에 로봇 정보 주입
    return true;
  }
}
