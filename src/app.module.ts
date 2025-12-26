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
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { CartsModule } from './carts/carts.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CategoriesModule } from './categories/categories.module';
import { UploadModule } from './upload/upload.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    /* ----------------------------------------
     * 1️⃣ CONFIG
     * ---------------------------------------- */
    ConfigModule.forRoot({ isGlobal: true }),

    /* ----------------------------------------
     * 2️⃣ CACHE (UPSTASH REDIS)
     * ---------------------------------------- */
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        // If Redis URL is not provided → fallback to in-memory cache
        if (!redisUrl) {
          console.warn('⚠️ REDIS_URL not set, using in-memory cache');
          return {
            ttl: 60 * 1000,
          };
        }

        return {
          store: await redisStore({
            url: redisUrl,
          }),
          ttl: 60 * 1000,
        };
      },
    }),

    /* ----------------------------------------
     * 3️⃣ MAILER
     * ---------------------------------------- */
    //   MailerModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: (configService: ConfigService) => ({
    //     transport: {
    //       host: configService.get('EMAIL_HOST'),
    //       port: Number(configService.get('EMAIL_PORT')),
    //       secure: false,
    //       auth: {
    //         user: configService.get('EMAIL_USER'),
    //         pass: configService.get('EMAIL_PASSWORD'),
    //       },
    //     },
    //     defaults: {
    //       from: `"ShopSphere" <${configService.get('EMAIL_USER')}>`,
    //     },
    //     template: {
    //       dir: join(process.cwd(), 'templates'), // ✅ SINGLE SOURCE
    //       adapter: new HandlebarsAdapter(),
    //       options: {
    //         strict: true,
    //       },
    //     },
    //   }),
    //   inject: [ConfigService],
    // }),

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

    
    /* ----------------------------------------
     * 4️⃣ SCHEDULER
     * ---------------------------------------- */
    ScheduleModule.forRoot(),

    /* ----------------------------------------
     * 5️⃣ APPLICATION MODULES
     * ---------------------------------------- */
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
})
export class AppModule {}
