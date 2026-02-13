import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';

import { REDIS_CLIENT } from '../redis/redis.module';
import type { RedisClient } from '../redis/redis.types';
import { MqService } from '../mq/mq.service';
import { Robot } from './robot.entity';
import type { TelemetryDto } from './dto/telemetry.dto';
import { TelemetryHistory } from '../telemetry-history/telemetry-history.entity';

type TelemetryPayload = {
  robotId: string;
  telemetry: TelemetryDto;
  receivedAt: string;
};

@Injectable()
export class RobotsService {
  private readonly logger = new Logger(RobotsService.name);

  constructor(
    @InjectRepository(Robot)
    private readonly robotsRepo: Repository<Robot>,

    @InjectRepository(TelemetryHistory)
    private readonly telemetryHistoryRepo: Repository<TelemetryHistory>,

    private readonly config: ConfigService,

    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClient,

    private readonly mq: MqService,
  ) {}

  private telemetryKey(robotId: string) {
    return `robot:${robotId}:telemetry`;
  }

  async create(name: string, model: string) {
    const apiKey = crypto.randomUUID();
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const robot = this.robotsRepo.create({ name, model, apiKeyHash });
    const saved = await this.robotsRepo.save(robot);

    this.logger.log(
      `[EVENT] robot.created robotId=${saved.id} name=${saved.name} model=${saved.model}`,
    );

    // ✅ 프론트에서 바로 이름/모델 뜨게
    return {
      id: saved.id,
      name: saved.name,
      model: saved.model,
      apiKey,
    };
  }

  async deleteRobot(robotId: string) {
    const robot = await this.robotsRepo.findOne({ where: { id: robotId } });
    if (!robot) {
      this.logger.warn(`[EVENT] robot.delete_not_found robotId=${robotId}`);
      return { deleted: false, reason: 'NOT_FOUND' };
    }

    // 1) Redis 마지막 telemetry 캐시 삭제
    try {
      await this.redis.del(this.telemetryKey(robotId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `[EVENT] telemetry.cache_delete_failed robotId=${robotId} err=${msg}`,
      );
      // 캐시 삭제 실패는 치명적이지 않아서 계속 진행
    }

    // 2) DB telemetry history 삭제 (정책: MVP에서는 같이 삭제)
    await this.telemetryHistoryRepo.delete({ robotId });

    // 3) DB 로봇 삭제
    await this.robotsRepo.delete({ id: robotId });

    this.logger.warn(`[EVENT] robot.deleted robotId=${robotId}`);

    return { deleted: true, robotId };
  }

  // online 포함해서 내려줌
  async findAll() {
    const robots = await this.robotsRepo.find({
      select: ['id', 'name', 'model', 'createdAt'],
    });

    const result: Array<{
      id: string;
      name: string;
      model: string;
      createdAt: Date;
      online: boolean;
    }> = [];

    for (const r of robots) {
      const exists = await this.redis.exists(this.telemetryKey(r.id));
      result.push({
        id: r.id,
        name: r.name,
        model: r.model,
        createdAt: r.createdAt,
        online: exists === 1,
      });
    }

    return result;
  }

  async findById(id: string) {
    const robot = await this.robotsRepo.findOne({
      where: { id },
      select: ['id', 'name', 'model', 'createdAt'],
    });

    if (!robot) return null;

    const exists = await this.redis.exists(this.telemetryKey(robot.id));
    return {
      id: robot.id,
      name: robot.name,
      model: robot.model,
      createdAt: robot.createdAt,
      online: exists === 1,
    };
  }

  async findByApiKeyHash(hash: string) {
    return this.robotsRepo.findOne({
      where: { apiKeyHash: hash },
    });
  }

  async ingestTelemetry(robotId: string, telemetry: TelemetryDto) {
    const ttl = Number(this.config.get<string>('REDIS_TTL_SECONDS', '60'));
    const key = this.telemetryKey(robotId);

    const payload: TelemetryPayload = {
      robotId,
      telemetry,
      receivedAt: new Date().toISOString(),
    };

    // 1) Redis: 실시간 최신 상태
    await this.redis.set(key, JSON.stringify(payload), 'EX', ttl);

    // ✅ 관제 이벤트 로그 (캐시 저장 성공)
    this.logger.log(
      `[EVENT] telemetry.cached robotId=${robotId} battery=${telemetry.battery} status=${telemetry.status} ttl=${ttl}`,
    );

    // 2) RabbitMQ: 비동기 영속 저장용 이벤트 발행
    try {
      await this.mq.publish('telemetry.ingested', {
        eventType: 'telemetry.ingested',
        ...payload,
      });

      // ✅ 관제 이벤트 로그 (발행 성공)
      this.logger.log(
        `[EVENT] telemetry.published rk=telemetry.ingested robotId=${robotId}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);

      // ✅ 관제 이벤트 로그 (발행 실패)
      this.logger.error(
        `[EVENT] telemetry.publish_failed robotId=${robotId} err=${msg}`,
      );
      throw e;
    }

    return { ok: true, robotId, ttl };
  }

  async getTelemetry(robotId: string): Promise<TelemetryPayload | null> {
    const key = this.telemetryKey(robotId);
    const raw = await this.redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as TelemetryPayload;
  }

  async getTelemetryHistory(robotId: string, page: number, limit: number) {
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(100, Math.max(1, limit || 20));

    const [rows, total] = await this.telemetryHistoryRepo.findAndCount({
      where: { robotId },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    this.logger.log(
      `[EVENT] telemetry.history_queried robotId=${robotId} page=${safePage} limit=${safeLimit} total=${total}`,
    );

    return {
      data: rows,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }
}
