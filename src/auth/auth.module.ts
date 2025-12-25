// src/auth/auth.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { KeycloakStrategy } from './keycloak.strategy'; // 👈 NEW: Keycloak Strategy
import { EmailModule } from '../email/email.module';
import { APP_GUARD } from '@nestjs/core';
import { KeycloakAuthGuard } from './keycloak-auth.guard'; // 👈 NEW: Keycloak Guard
import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_ACCESS_SECRET');
        const expiresInString = configService.get<string>('JWT_ACCESS_EXPIRATION');

        // --- VALIDATION: Kiểm tra JWT Secret và Expiration ---
        if (!secret || !expiresInString) {
          throw new Error('FATAL_ERROR: JWT Access secret or expiration not defined in .env');
        }

        // Kiểm tra độ mạnh của secret (ít nhất 32 ký tự)
        if (secret.length < 32) {
          throw new Error('FATAL_ERROR: JWT_ACCESS_SECRET must be at least 32 characters long for security');
        }

        // Kiểm tra expiration là số hợp lệ
        const expiresIn = parseInt(expiresInString, 10);
        if (isNaN(expiresIn) || expiresIn <= 0) {
          throw new Error('FATAL_ERROR: JWT_ACCESS_EXPIRATION must be a positive number');
        }
        // --- KẾT THÚC VALIDATION ---

        return {
          secret: secret,
          signOptions: {
            expiresIn: expiresIn,
            algorithm: 'HS256', // Chỉ sử dụng HS256 algorithm
          },
        };
      },
      inject: [ConfigService],
    }),
    EmailModule,
  ],
  providers: [
    AuthService, 
    LocalStrategy, 
    JwtStrategy,
    KeycloakStrategy, // 👈 NEW: Add Keycloak Strategy
    Reflector, // 👈 Cần thiết cho JwtAuthGuard
    JwtAuthGuard,
    KeycloakAuthGuard,
    // 👇 NEW: Apply Keycloak Guard globally (use @Public() to bypass)
    // {
    //   provide: APP_GUARD,
    //   useClass: KeycloakAuthGuard,
    // },
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, KeycloakAuthGuard],
})
export class AuthModule {}