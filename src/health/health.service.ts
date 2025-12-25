import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

export interface HealthStatus {
  status: 'ok' | 'error';
  database: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: number;
    error?: string;
  };
  redis: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: number;
    error?: string;
  };
  timestamp: string;
  uptime: number;
  environment: string;
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    const [databaseStatus, redisStatus] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const database = databaseStatus.status === 'fulfilled' 
      ? databaseStatus.value 
      : { status: 'error' as const, error: databaseStatus.reason?.message || 'Unknown error' };

    const redis = redisStatus.status === 'fulfilled'
      ? redisStatus.value
      : { status: 'error' as const, error: redisStatus.reason?.message || 'Unknown error' };

    // Overall status: ok if database is connected (Redis is optional)
    const overallStatus = database.status === 'connected'
      ? 'ok'
      : 'error';

    return {
      status: overallStatus,
      database,
      redis,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000), // seconds
      environment: this.configService.get<string>('NODE_ENV', 'development'),
    };
  }

  private async checkDatabase(): Promise<{ status: 'connected' | 'disconnected' | 'error'; responseTime?: number; error?: string }> {
    try {
      const startTime = Date.now();
      // Simple query to check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        status: 'connected',
        responseTime,
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error.message || 'Database connection failed',
      };
    }
  }

  private async checkRedis(): Promise<{ status: 'connected' | 'disconnected' | 'error'; responseTime?: number; error?: string }> {
    try {
      const startTime = Date.now();
      
      // Try to get/set a test key to verify Redis connection
      const testKey = 'health:check';
      const testValue = Date.now().toString();
      
      await this.cacheManager.set(testKey, testValue, 5); // 5 seconds TTL
      const retrieved = await this.cacheManager.get(testKey);
      await this.cacheManager.del(testKey);
      
      const responseTime = Date.now() - startTime;

      // If we can set/get/delete, Redis is working
      if (retrieved === testValue) {
        return {
          status: 'connected',
          responseTime,
        };
      } else {
        return {
          status: 'disconnected',
          error: 'Redis test failed: value mismatch',
        };
      }
    } catch (error: any) {
      // If cache manager is in-memory (Redis not available), it will still work
      // but we should indicate it's not using Redis
      if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Redis')) {
        return {
          status: 'disconnected',
          error: 'Redis not available, using in-memory cache',
        };
      }
      
      return {
        status: 'error',
        error: error.message || 'Redis check failed',
      };
    }
  }
}

