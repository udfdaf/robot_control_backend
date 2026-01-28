import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';

import { REDIS_CLIENT } from '../redis/redis.module';
import type { RedisClient } from '../redis/redis.types';
import { Robot } from './robot.entity';
import type { TelemetryDto } from './dto/telemetry.dto';

type TelemetryPayload = {
  robotId: string;
  telemetry: TelemetryDto;
  receivedAt: string;
};

@Injectable()
export class RobotsService {
  constructor(
    @InjectRepository(Robot)
    private readonly robotsRepo: Repository<Robot>,

    private readonly config: ConfigService,

    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClient,
  ) {}

  async create(name: string, model: string) {
    const apiKey = crypto.randomUUID();
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const robot = this.robotsRepo.create({ name, model, apiKeyHash });
    const saved = await this.robotsRepo.save(robot);

    return { id: saved.id, apiKey };
  }

  async findAll() {
    return this.robotsRepo.find({
      select: ['id', 'name', 'model', 'createdAt'],
    });
  }

  async findById(id: string) {
    return this.robotsRepo.findOne({
      where: { id },
      select: ['id', 'name', 'model', 'createdAt'],
    });
  }

  async findByApiKeyHash(hash: string) {
    return this.robotsRepo.findOne({
      where: { apiKeyHash: hash },
    });
  }

  async ingestTelemetry(robotId: string, telemetry: TelemetryDto) {
    const ttl = Number(this.config.get<string>('REDIS_TTL_SECONDS', '60'));
    const key = `robot:${robotId}:telemetry`;

    const payload: TelemetryPayload = {
      robotId,
      telemetry,
      receivedAt: new Date().toISOString(),
    };

    await this.redis.set(key, JSON.stringify(payload), 'EX', ttl);

    return { ok: true, robotId, ttl };
  }

  async getTelemetry(robotId: string): Promise<TelemetryPayload | null> {
    const key = `robot:${robotId}:telemetry`;
    const raw = await this.redis.get(key);

    if (!raw) return null;

    return JSON.parse(raw) as TelemetryPayload;
  }
}
