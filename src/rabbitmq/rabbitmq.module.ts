// src/rabbitmq/rabbitmq.module.ts
import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_SERVICE',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')!],
            queue: configService.get<string>(
              'RABBITMQ_QUEUE',
              'shopsphere_queue',
            ),
            noAck: false,
            // ❌ DO NOT define queueOptions
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitMQModule {}
