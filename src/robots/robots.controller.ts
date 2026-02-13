import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiHeader } from '@nestjs/swagger';

import { RobotsService } from './robots.service';
import { CreateRobotDto } from './dto/create-robot.dto';
import { TelemetryDto } from './dto/telemetry.dto';
import { RobotAuthGuard } from '../auth/robot-auth/robot-auth.guard';

@Controller('robots')
export class RobotsController {
  private readonly logger = new Logger(RobotsController.name);

  constructor(private readonly robotsService: RobotsService) {}

  // 로봇 등록 (최초 1회, 인증 없음)
  @Post()
  create(@Body() body: CreateRobotDto) {
    this.logger.log({
      event: 'robots.create',
      name: body.name,
      model: body.model,
    });

    return this.robotsService.create(body.name, body.model);
  }

  // 로봇 삭제 (현재 오픈, 추후 관리자 전용 가능)
  @Delete(':id')
  delete(@Param('id') id: string) {
    this.logger.warn({
      event: 'robots.delete',
      robotId: id,
    });

    return this.robotsService.deleteRobot(id);
  }

  // 로봇 전체 조회 (online 포함은 Service에서 계산)
  // ✅ polling 때문에 소음이 심해서 debug로 내림
  @Get()
  findAll() {
    this.logger.debug({
      event: 'robots.list',
    });

    return this.robotsService.findAll();
  }

  // 인증된 로봇 본인 정보
  @UseGuards(RobotAuthGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'Robot API Key',
    required: true,
  })
  @Get('me')
  me(@Req() req: Request) {
    this.logger.log({
      event: 'robots.me',
      robotId: req.robot!.id,
    });

    return req.robot;
  }

  // 현재 로봇의 마지막 telemetry 조회
  @UseGuards(RobotAuthGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'Robot API Key',
    required: true,
  })
  @Get('me/telemetry')
  async myTelemetry(@Req() req: Request) {
    this.logger.log({
      event: 'telemetry.get_latest',
      robotId: req.robot!.id,
    });

    const data = await this.robotsService.getTelemetry(req.robot!.id);

    return {
      robotId: req.robot!.id,
      online: data !== null,
      telemetry: data,
    };
  }

  // 현재 로봇의 telemetry history 조회 (pagination)
  @UseGuards(RobotAuthGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'Robot API Key',
    required: true,
  })
  @Get('me/telemetry/history')
  getTelemetryHistory(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    this.logger.log({
      event: 'telemetry.get_history',
      robotId: req.robot!.id,
      page: Number(page),
      limit: Number(limit),
    });

    return this.robotsService.getTelemetryHistory(
      req.robot!.id,
      Number(page),
      Number(limit),
    );
  }

  // 로봇 텔레메트리 송신 (Redis 저장 + MQ publish)
  @UseGuards(RobotAuthGuard)
  @ApiHeader({
    name: 'x-api-key',
    description: 'Robot API Key',
    required: true,
  })
  @Post('telemetry')
  telemetry(@Req() req: Request, @Body() body: TelemetryDto) {
    this.logger.log({
      event: 'telemetry.ingest',
      robotId: req.robot!.id,
      battery: body.battery,
      status: body.status,
    });

    return this.robotsService.ingestTelemetry(req.robot!.id, body);
  }

  // 로봇 단건 조회
  @Get(':id')
  findById(@Param('id') id: string) {
    this.logger.log({
      event: 'robots.get',
      robotId: id,
    });

    return this.robotsService.findById(id);
  }
}
