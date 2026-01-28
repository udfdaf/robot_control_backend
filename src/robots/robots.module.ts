import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisModule } from '../redis/redis.module';
import { Robot } from './robot.entity';
import { RobotsController } from './robots.controller';
import { RobotsService } from './robots.service';

@Module({
  imports: [TypeOrmModule.forFeature([Robot]), RedisModule],
  controllers: [RobotsController],
  providers: [RobotsService],
  exports: [RobotsService],
})
export class RobotsModule {}
