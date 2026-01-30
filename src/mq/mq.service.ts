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
import type { ConfirmChannel } from 'amqplib';

@Injectable()
export class MqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqService.name);

  private connection: AmqpConnectionManager | null = null;
  private channelWrapper: ChannelWrapper | null = null;

  private readonly exchange = 'telemetry.exchange';
  private readonly routingKey = 'telemetry.ingest';

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

  async publishTelemetry(message: unknown): Promise<void> {
    if (!this.channelWrapper) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    const payload = Buffer.from(JSON.stringify(message));

    await this.channelWrapper.publish(this.exchange, this.routingKey, payload, {
      persistent: true,
      contentType: 'application/json',
    });
  }
}
