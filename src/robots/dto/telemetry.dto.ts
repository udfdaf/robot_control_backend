import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * 로봇이 주기적으로 서버에 보내는 상태 정보(텔레메트리)
 */
export class TelemetryDto {
  @ApiProperty({
    description: '배터리 잔량(퍼센트)',
    example: 87,
  })
  @IsNumber()
  battery: number;

  @ApiProperty({
    description: '로봇 현재 상태',
    example: 'MOVING',
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: '위도 (선택)',
    example: 37.5665,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiProperty({
    description: '경도 (선택)',
    example: 126.978,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  lng?: number;
}
