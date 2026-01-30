import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisModule } from '../redis/redis.module';
import { Robot } from './robot.entity';
import { RobotsController } from './robots.controller';
import { RobotsService } from './robots.service';
import { MqModule } from '../mq/mq.module';
@Module({
  imports: [TypeOrmModule.forFeature([Robot]), RedisModule, MqModule],
  controllers: [RobotsController],
  providers: [RobotsService],
  exports: [RobotsService],
})
export class RobotsModule {}
