import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      // Cấu hình connection pool để xử lý nhiều concurrent requests
      // Prisma sẽ tự động parse connection_limit từ DATABASE_URL nếu có
      // Hoặc có thể set trực tiếp ở đây
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Logging cho development (có thể tắt trong production)
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}