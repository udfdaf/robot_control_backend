import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Robot } from './robot.entity';
import * as crypto from 'crypto';

@Injectable()
export class RobotsService {
  constructor(
    @InjectRepository(Robot)
    private readonly robotsRepo: Repository<Robot>,
  ) {}

  async create(name: string, model: string) {
    const apiKey = crypto.randomUUID(); // 일단 데모용
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const robot = this.robotsRepo.create({ name, model, apiKeyHash });
    const saved = await this.robotsRepo.save(robot);

    return { id: saved.id, apiKey }; // apiKey는 "한 번만" 내려준다고 치는 컨셉
  }
}
