import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('robots')
export class Robot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string; 

  @Column({ length: 100 })
  model: string;

  @Column({ name: 'api_key_hash', length: 255 })
  apiKeyHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
