import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiHeader } from '@nestjs/swagger';

import { RobotsService } from './robots.service';
import { CreateRobotDto } from './dto/create-robot.dto';
import { TelemetryDto } from './dto/telemetry.dto';
import { RobotAuthGuard } from '../auth/robot-auth/robot-auth.guard';

@Controller('robots')
export class RobotsController {
  constructor(private readonly robotsService: RobotsService) {}

  // 로봇 등록 (최초 1회, 인증 없음)
  @Post()
  create(@Body() body: CreateRobotDto) {
    return this.robotsService.create(body.name, body.model);
  }

  // 로봇 전체 조회 (현재 오픈, 추후 관리자 전용 가능)
  @Get()
  findAll() {
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
    const data = await this.robotsService.getTelemetry(req.robot!.id);

    return {
      robotId: req.robot!.id,
      online: data !== null,
      telemetry: data,
    };
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
    return this.robotsService.ingestTelemetry(req.robot!.id, body);
  }

  // 로봇 단건 조회
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.robotsService.findById(id);
  }
}
