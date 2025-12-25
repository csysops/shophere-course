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
   * 1️⃣ TRUST PROXY (REQUIRED FOR RENDER)
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
   * 4️⃣ CORS (RENDER + BROWSER SAFE)
   * ---------------------------------------- */

  app.enableCors({
    origin: 'https://shophere-frontend.onrender.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
  });

  /* ----------------------------------------
   * 5️⃣ HANDLE OPTIONS BEFORE RATE LIMIT
   * ---------------------------------------- */
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      );
      res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Content-Disposition',
      );
      res.header('Access-Control-Allow-Credentials', 'true');
      return res.sendStatus(204);
    }
    next();
  });

  /* ----------------------------------------
   * 6️⃣ RATE LIMITING (SAFE)
   * ---------------------------------------- */
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: configService.get<number>('RATE_LIMIT_MAX', 1000),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) =>
      req.method === 'OPTIONS' ||
      req.path === '/api/health' ||
      req.path === '/health',
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
   * 7️⃣ START SERVER
   * ---------------------------------------- */
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 API running on port ${port}`);
}

bootstrap();
