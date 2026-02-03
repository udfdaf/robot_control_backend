import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TelemetryConsumerService } from './telemetry-consumer.service';
import { TelemetryHistory } from '../telemetry-history/telemetry-history.entity';
import { MqModule } from '../mq/mq.module';

@Module({
  imports: [MqModule, TypeOrmModule.forFeature([TelemetryHistory])],
  providers: [TelemetryConsumerService],
})
export class TelemetryConsumerModule {}
