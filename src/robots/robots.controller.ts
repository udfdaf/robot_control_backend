import { Body, Controller, Post } from '@nestjs/common';
import { CreateRobotDto } from './dto/create-robot.dto';
import { RobotsService } from './robots.service';

@Controller('robots')
export class RobotsController {
  constructor(private readonly robotsService: RobotsService) {}

  @Post()
  create(@Body() body: CreateRobotDto) {
    return this.robotsService.create(body.name, body.model);
  }
}
