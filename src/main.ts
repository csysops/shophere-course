import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import rateLimit from 'express-rate-limit';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  /* ----------------------------------------
   * 1️⃣ REQUIRED FOR RENDER (TRUST PROXY)
   * ---------------------------------------- */
  app.set('trust proxy', 1);

  /* ----------------------------------------
   * 2️⃣ STATIC FILES
   * ---------------------------------------- */
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  /* ----------------------------------------
   * 3️⃣ GLOBAL API PREFIX
   * ---------------------------------------- */
  app.setGlobalPrefix('api');

  /* ----------------------------------------
   * 4️⃣ CORS (ENV-BASED)
   * ---------------------------------------- */
  const corsOriginsEnv = configService.get<string>('CORS_ORIGINS');

  const corsOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map(o => o.trim())
    : [
        'http://localhost:3000',
        'http://localhost:5173'
      ];
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow server-to-server & tools like curl/postman
      if (!origin) return callback(null, true);
  
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }
  
      console.error('❌ Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
  });


  /* ----------------------------------------
   * 5️⃣ RATE LIMITING (SAFE FOR RENDER)
   * ---------------------------------------- */
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: configService.get<number>('RATE_LIMIT_MAX', 1000),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) =>
      req.path === '/api/health' || req.path === '/health',
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  });

  app.use('/api', globalLimiter);
  app.use('/api/auth/login', authLimiter);

  app.use(
    '/api/auth/register',
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 3,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(
    '/api/auth/forgot-password',
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 3,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  /* ----------------------------------------
   * 6️⃣ START SERVER (RENDER PORT)
   * ---------------------------------------- */
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 API running on port ${port}`);
}

bootstrap();
