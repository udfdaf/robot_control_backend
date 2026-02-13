import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MqService } from '../mq/mq.service';
import { TelemetryHistory } from '../telemetry-history/telemetry-history.entity';

type TelemetryIngestedEvent = {
  eventType: 'telemetry.ingested';
  robotId: string;
  telemetry: {
    battery: number;
    status: string;
    lat?: number;
    lng?: number;
  };
  receivedAt: string; // ISO string
};

function isTelemetryIngestedEvent(x: unknown): x is TelemetryIngestedEvent {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;

  if (o.eventType !== 'telemetry.ingested') return false;
  if (typeof o.robotId !== 'string') return false;
  if (typeof o.receivedAt !== 'string') return false;

  const t = o.telemetry as Record<string, unknown> | undefined;
  if (!t || typeof t !== 'object') return false;

  return (
    typeof t.battery === 'number' &&
    typeof t.status === 'string' &&
    (t.lat === undefined || typeof t.lat === 'number') &&
    (t.lng === undefined || typeof t.lng === 'number')
  );
}

@Injectable()
export class TelemetryConsumerService implements OnModuleInit {
  private readonly logger = new Logger(TelemetryConsumerService.name);

  constructor(
    private readonly mq: MqService,
    @InjectRepository(TelemetryHistory)
    private readonly telemetryRepo: Repository<TelemetryHistory>,
  ) {}

  async onModuleInit() {
    // consume 자체 로그는 굳이 필요 없지만, 초기화 1줄은 남겨도 OK
    this.logger.log('[EVENT] consumer.init telemetry.history.save');

    await this.mq.consume(
      'telemetry.history.save',
      'telemetry.ingested',
      async (payload) => {
        // 1) payload 구조 오류 → DROP (재시도 X)
        if (!isTelemetryIngestedEvent(payload)) {
          this.logger.warn(
            `[DROP] telemetry.invalid_payload raw=${JSON.stringify(payload)}`,
          );
          return; // ✅ throw 하지 말고 return → ack 되게 (invalid는 drop 정책)
        }

        // 2) DB 저장 성공/실패
        try {
          await this.telemetryRepo.save({
            robotId: payload.robotId,
            battery: payload.telemetry.battery,
            status: payload.telemetry.status,
            lat: payload.telemetry.lat ?? null,
            lng: payload.telemetry.lng ?? null,
            // createdAt은 CreateDateColumn이면 자동
          });

          // ✅ 관제 이벤트 로그: DB 저장 성공
          this.logger.log(
            `[EVENT] telemetry.persisted robotId=${payload.robotId} battery=${payload.telemetry.battery} status=${payload.telemetry.status}`,
          );

          return; // ack
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);

          // ✅ 관제 이벤트 로그: DB 저장 실패 → 재시도
          this.logger.error(
            `[RETRY] telemetry.persist_failed robotId=${payload.robotId} err=${msg}`,
          );

          throw e; // nack(requeue)
        }
      },
    );

    this.logger.log(
      '[EVENT] consumer.bound queue=telemetry.his tory.save rk=telemetry.ingested',
    );
  }
}
