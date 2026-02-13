import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from './redis/redis.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RobotsModule } from './robots/robots.module';
import { AdminModule } from './admin/admin.module';
import { TelemetryConsumerModule } from './telemetry-consumer/telemetry-consumer.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // ✅ 루트의 .env를 확실히 읽게 고정
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('DB_HOST');
        const port = Number(config.get<string>('DB_PORT'));
        const username = config.get<string>('DB_USER') ?? 'roboops'; // ✅ fallback
        const password = config.get<string>('DB_PASSWORD') ?? 'roboops';
        const database = config.get<string>('DB_NAME') ?? 'roboops';

        console.log('DB_HOST=', host);
        console.log('DB_PORT=', port);
        console.log('DB_USER=', username);
        console.log('DB_NAME=', database);

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          autoLoadEntities: true,
          synchronize: true, // 지금은 OK (나중에 false)
        };
      },
    }),
    RedisModule,
    TelemetryConsumerModule,
    RobotsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
