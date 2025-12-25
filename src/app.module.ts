// src/app.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailModule } from './email/email.module';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { EventsController } from './events/events.controller';
import { OrdersModule } from './orders/orders.module';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxModule } from './outbox/outbox.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { CartsModule } from './carts/carts.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CategoriesModule } from './categories/categories.module';
import { UploadModule } from './upload/upload.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        
        // Sử dụng Redis store nếu Redis có sẵn, fallback về in-memory
        try {
          const store = await redisStore({
            host: redisHost,
            port: redisPort,
            ttl: 60, // TTL in seconds for Redis
          });
          
          return {
            store: store as any,
            ttl: 60 * 1000, // 60 seconds in milliseconds (for compatibility)
          };
        } catch (error) {
          console.warn('Redis connection failed, falling back to in-memory cache:', error.message);
          // Fallback to in-memory cache if Redis is not available
          return {
            ttl: 60 * 1000, // 60 seconds
          };
        }
      },
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('EMAIL_HOST'),
          port: parseInt(configService.get<string>('EMAIL_PORT') || '587', 10),
          secure: false, // Use TLS (STARTTLS) for port 587
          auth: {
            user: configService.get<string>('EMAIL_USER'),
            pass: configService.get<string>('EMAIL_PASSWORD'),
          },
        },
        defaults: {
          from: `"ShopSphere" <${configService.get<string>('EMAIL_USER')}>`,
        },
        template: {
          dir: join(process.cwd(), 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    ProductsModule,
    UsersModule,
    AuthModule,
    EmailModule,
    OrdersModule,
    OutboxModule,
    RabbitMQModule,
    CartsModule,
    ReviewsModule,
    CategoriesModule,
    UploadModule,
    HealthModule,
  ],
  controllers: [AppController, EventsController],
  providers: [AppService],
  exports: [],
})
export class AppModule { }
