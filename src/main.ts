
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices'; 
import { VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import rateLimit from 'express-rate-limit';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // 1. Tạo ứng dụng HTTP (cho API)
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  
  // Serve static files từ uploads folder
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api');
  
  // Enable CORS for frontend - Hỗ trợ cả HTTP và HTTPS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://localhost:3000',
      'https://localhost:3001',
      'https://localhost:3002',
      'http://localhost:5173',
      'https://localhost:5173',
    ], // Cho phép frontend (HTTP và HTTPS)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
  });

  // Rate Limiting - Bảo vệ API khỏi abuse và DDoS
  // Global rate limiter cho tất cả API endpoints
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: configService.get<number>('RATE_LIMIT_MAX', 1000), // 1000 requests per window (có thể config)
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skip: (req) => {
      // Skip rate limiting for health check endpoints
      return req.path === '/api/health' || req.path === '/health';
    },
  });

  // Stricter rate limiter cho authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Chỉ cho phép 5 attempts
    message: {
      error: 'Too many login attempts, please try again after 15 minutes.',
      retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Chỉ đếm failed requests
  });

  // Apply rate limiters
  app.use('/api', globalLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registration attempts per hour
    message: {
      error: 'Too many registration attempts, please try again later.',
      retryAfter: '1 hour',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }));
  app.use('/api/auth/forgot-password', rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset attempts per hour
    message: {
      error: 'Too many password reset attempts, please try again later.',
      retryAfter: '1 hour',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Tạm thời comment RabbitMQ để chạy demo (cần Docker/RabbitMQ để enable)
  // app.connectMicroservice<MicroserviceOptions>({
  //   transport: Transport.RMQ,
  //   options: {
  //     urls: ['amqp://localhost:5672'], 
  //     queue: 'shopsphere_queue',     
  //     queueOptions: {
  //       durable: false,
  //     },
  //   },
  // });

  // 3. 👈 Khởi động cả hai (HTTP và Microservice)
  // await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();