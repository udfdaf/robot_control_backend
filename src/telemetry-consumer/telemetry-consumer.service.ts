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
    this.logger.log('TelemetryConsumerService initializing...');

    await this.mq.consume(
      'telemetry.history.save',
      'telemetry.ingested',
      async (payload) => {
        if (!isTelemetryIngestedEvent(payload)) {
          this.logger.warn(`[raw] ${JSON.stringify(payload)}`);
          throw new Error('INVALID_TELEMETRY_PAYLOAD');
        }

        await this.telemetryRepo.save({
          robotId: payload.robotId,
          battery: payload.telemetry.battery,
          status: payload.telemetry.status,
          lat: payload.telemetry.lat ?? null,
          lng: payload.telemetry.lng ?? null,
          // createdAt 컬럼이 있다면 receivedAt 매핑도 고려 가능
        });

        this.logger.log(
          `Telemetry saved: robotId=${payload.robotId}, battery=${payload.telemetry.battery}, status=${payload.telemetry.status}`,
        );
      },
    );

    this.logger.log('Consume binding registered');
  }
}
