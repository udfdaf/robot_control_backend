import { Module } from '@nestjs/common';
import { MqService } from './mq.service';

@Module({
  providers: [MqService],
  exports: [MqService],
})
export class MqModule {}
