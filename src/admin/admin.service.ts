import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { Robot } from '../robots/robot.entity';
import { TelemetryHistory } from '../telemetry-history/telemetry-history.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Robot)
    private readonly robotsRepo: Repository<Robot>,
    @InjectRepository(TelemetryHistory)
    private readonly telemetryHistoryRepo: Repository<TelemetryHistory>,
  ) {}

  private clampPage(page: number) {
    if (!Number.isFinite(page) || page < 1) return 1;
    return Math.floor(page);
  }

  private clampLimit(limit: number) {
    if (!Number.isFinite(limit) || limit < 1) return 50;
    return Math.min(200, Math.floor(limit));
  }

  // ✅ logs는 프론트에서 300 기본이라 별도 clamp
  private clampLogLimit(limit: number) {
    if (!Number.isFinite(limit) || limit < 1) return 300;
    return Math.min(2000, Math.floor(limit));
  }

  async getRobots(page: number, limit: number) {
    const p = this.clampPage(page);
    const l = this.clampLimit(limit);

    const [rows, total] = await this.robotsRepo.findAndCount({
      select: ['id', 'name', 'model', 'createdAt'], // ✅ apiKeyHash는 절대 노출 X
      order: { createdAt: 'DESC' },
      skip: (p - 1) * l,
      take: l,
    });

    return {
      rows,
      meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    };
  }

  async getTelemetryHistory(page: number, limit: number) {
    const p = this.clampPage(page);
    const l = this.clampLimit(limit);

    const [rows, total] = await this.telemetryHistoryRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (p - 1) * l,
      take: l,
    });

    return {
      rows,
      meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    };
  }

  // ✅ 추가: 로그 조회
  // 응답 형태는 프론트(api.ts)가 기대하는 그대로:
  // { lines: string[], meta: { file, exists, limit } }
  getLogs(limit: number) {
    const l = this.clampLogLimit(limit);

    const file =
      process.env.ADMIN_LOG_FILE?.trim() ||
      path.resolve(process.cwd(), 'logs', 'app.log');

    if (!fs.existsSync(file)) {
      return {
        lines: [`[DROP] log file not found: ${file}`],
        meta: { file, exists: false, limit: l },
      };
    }

    const raw = fs.readFileSync(file, 'utf-8');
    const lines = raw.split(/\r?\n/).filter((x) => x.trim().length > 0);

    // 최신이 위로 오게
    const tail = lines.slice(Math.max(0, lines.length - l)).reverse();

    return {
      lines: tail,
      meta: { file, exists: true, limit: l },
    };
  }
}
