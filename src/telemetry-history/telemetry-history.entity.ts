import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('telemetry_history')
@Index(['robotId', 'createdAt'])
export class TelemetryHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  robotId: string;

  @Column({ type: 'int' })
  battery: number;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'float', nullable: true })
  lat: number | null;

  @Column({ type: 'float', nullable: true })
  lng: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
