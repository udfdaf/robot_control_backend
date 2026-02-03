import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  connect,
  type AmqpConnectionManager,
  type ChannelWrapper,
} from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';

type ConsumeHandler = (payload: unknown, raw: ConsumeMessage) => Promise<void>;

@Injectable()
export class MqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqService.name);

  private connection: AmqpConnectionManager | null = null;
  private channelWrapper: ChannelWrapper | null = null;

  private readonly exchange = 'telemetry.exchange';

  onModuleInit() {
    const url = process.env.RABBITMQ_URL;
    if (typeof url !== 'string' || url.length === 0) {
      throw new Error('RABBITMQ_URL is not set');
    }

    this.connection = connect([url]);

    this.connection.on('connect', () => {
      this.logger.log('RabbitMQ connected');
    });

    this.connection.on('disconnect', (params) => {
      const err = params?.err;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`RabbitMQ disconnected: ${msg}`);
    });

    this.channelWrapper = this.connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await channel.assertExchange(this.exchange, 'topic', { durable: true });
      },
    });
  }

  async onModuleDestroy() {
    try {
      await this.channelWrapper?.close();
      await this.connection?.close();
    } finally {
      this.channelWrapper = null;
      this.connection = null;
    }
  }

  async publish(exchangeRoutingKey: string, message: unknown): Promise<void> {
    if (!this.channelWrapper) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    const payload = Buffer.from(JSON.stringify(message));

    await this.channelWrapper.publish(
      this.exchange,
      exchangeRoutingKey,
      payload,
      {
        persistent: true,
        contentType: 'application/json',
      },
    );
  }

  /**
   * queue에 바인딩하고 consume 시작
   */
  async consume(
    queueName: string,
    routingKey: string,
    handler: ConsumeHandler,
  ): Promise<void> {
    if (!this.channelWrapper) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await channel.assertExchange(this.exchange, 'topic', { durable: true });

      await channel.assertQueue(queueName, { durable: true });
      await channel.bindQueue(queueName, this.exchange, routingKey);

      await channel.prefetch(10);

      await channel.consume(
        queueName,
        (msg: ConsumeMessage | null) => {
          if (!msg) return;

          void (async () => {
            try {
              const raw = msg.content.toString('utf-8');

              let parsed: unknown = undefined;
              try {
                parsed = JSON.parse(raw) as unknown;
              } catch {
                // JSON 깨진 케이스
                this.logger.warn('Invalid JSON message received');
                channel.nack(msg, false, false);
                return;
              }

              await handler(parsed, msg);
              channel.ack(msg);
            } catch (err) {
              const e = err instanceof Error ? err : new Error('Unknown error');
              this.logger.error(
                `Consume handler failed: ${e.message}`,
                e.stack,
              );
              // 영구 오류 → 버림
              if (e.message === 'INVALID_TELEMETRY_PAYLOAD') {
                channel.nack(msg, false, false); // requeue x 스키마 오류는 재시도 의미x
                return;
              }

              // 나머지는 일시 오류로 간주 -> 재시도, requeue o
              channel.nack(msg, false, true);
            }
          })();
        },
        { noAck: false },
      );

      this.logger.log(
        `Consumer started: queue=${queueName}, key=${routingKey}`,
      );
    });
  }
}
