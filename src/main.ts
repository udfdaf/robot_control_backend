import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import 'reflect-metadata';
import { logger } from './logger/logger.config';

function toText(msg: unknown): string {
  if (typeof msg === 'string') return msg;
  try {
    return JSON.stringify(msg);
  } catch {
    return String(msg);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: ['http://localhost:5173'],
  });

  app.useLogger({
    log: (message: unknown, context?: string) => {
      logger.info(toText(message), { context });
    },
    error: (message: unknown, trace?: string, context?: string) => {
      logger.error(toText(message), { context, trace });
    },
    warn: (message: unknown, context?: string) => {
      logger.warn(toText(message), { context });
    },
    debug: (message: unknown, context?: string) => {
      logger.debug(toText(message), { context });
    },
    verbose: (message: unknown, context?: string) => {
      logger.verbose(toText(message), { context });
    },
  });

  const config = new DocumentBuilder()
    .setTitle('RoboOps API')
    .setDescription('Robot fleet monitoring backend')
    .setVersion('0.1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000);
}
void bootstrap();
