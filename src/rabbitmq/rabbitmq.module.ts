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

            // ✅ REQUIRED for Direct Reply-To (RPC)
            noAck: true,

            // ❌ DO NOT declare queueOptions
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitMQModule {}
