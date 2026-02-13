import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { AdminKeyGuard } from './admin-key.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiHeader({
  name: 'x-admin-key',
  description: 'Admin API Key',
  required: true,
})
@UseGuards(AdminKeyGuard)
@Controller('admin/db')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('robots')
  getRobots(@Query('page') page = '1', @Query('limit') limit = '50') {
    return this.adminService.getRobots(Number(page), Number(limit));
  }

  @Get('telemetry-history')
  getTelemetryHistory(@Query('page') page = '1', @Query('limit') limit = '50') {
    return this.adminService.getTelemetryHistory(Number(page), Number(limit));
  }

  // ✅ 추가: 로그 조회
  // 프론트: /admin/db/logs?limit=300
  @Get('logs')
  getLogs(@Query('limit') limit = '300') {
    return this.adminService.getLogs(Number(limit));
  }
}
