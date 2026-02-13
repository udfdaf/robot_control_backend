import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Robot } from '../robots/robot.entity';
import { TelemetryHistory } from '../telemetry-history/telemetry-history.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Robot, TelemetryHistory])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
