import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Robot } from './robot.entity';
import { RobotsController } from './robots.controller';
import { RobotsService } from './robots.service';

@Module({
  imports: [TypeOrmModule.forFeature([Robot])],
  controllers: [RobotsController],
  providers: [RobotsService],
})
export class RobotsModule {}
