import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateRobotDto {
  @ApiProperty({
    example: 'robo-1',
    description: '로봇 이름',
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    example: 'v1',
    description: '로봇 모델',
  })
  @IsString()
  @MinLength(1)
  model: string;
}
