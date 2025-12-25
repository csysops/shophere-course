// src/auth/auth.service.ts
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    
    // Check if user has a password (not a Keycloak-only user)
    if (!user || !user.passwordHash) {
      return null;
    }
    
    if (await bcrypt.compare(pass, user.passwordHash)) {
      // Check if user is verified
      if (!user.isVerified) {
        throw new BadRequestException('Please verify your email before logging in');
      }
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async register(createUserDto: any) {
    return this.usersService.create(createUserDto);
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new verification code
    const verificationCode = uuidv4();

    // Update user with new verification code
    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationCode },
    });

    // Send verification email
    await this.emailService.sendUserVerification(user, verificationCode);

    return { message: 'Verification email sent successfully' };
  }

  async verifyEmail(code: string) {
    const user = await this.prisma.user.findUnique({
      where: { verificationCode: code },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification code');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Update user to verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationCode: null, // Clear the code after verification
      },
    });

    return { message: 'Email verified successfully' };
  }

  /**
   * MỚI: Hàm helper để tạo cả 2 token
   */
private async _generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    // --- VALIDATION: Kiểm tra JWT Secrets và Expirations ---
    
    // 1. Lấy giá trị string từ environment
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const accessExpiresString = this.configService.get<string>('JWT_ACCESS_EXPIRATION');
    
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const refreshExpiresString = this.configService.get<string>('JWT_REFRESH_EXPIRATION');

    // 2. Kiểm tra tồn tại
    if (!accessSecret || !accessExpiresString || !refreshSecret || !refreshExpiresString) {
      throw new Error('FATAL_ERROR: JWT secrets or expirations not defined in .env');
    }

    // 3. Kiểm tra độ mạnh của secrets (ít nhất 32 ký tự)
    if (accessSecret.length < 32) {
      throw new Error('FATAL_ERROR: JWT_ACCESS_SECRET must be at least 32 characters long for security');
    }
    if (refreshSecret.length < 32) {
      throw new Error('FATAL_ERROR: JWT_REFRESH_SECRET must be at least 32 characters long for security');
    }

    // 4. Chuyển đổi an toàn sang number và validate
    const accessExpires = parseInt(accessExpiresString, 10);
    const refreshExpires = parseInt(refreshExpiresString, 10);

    if (isNaN(accessExpires) || accessExpires <= 0) {
      throw new Error('FATAL_ERROR: JWT_ACCESS_EXPIRATION must be a positive number');
    }
    if (isNaN(refreshExpires) || refreshExpires <= 0) {
      throw new Error('FATAL_ERROR: JWT_REFRESH_EXPIRATION must be a positive number');
    }

    // --- KẾT THÚC VALIDATION ---

    // 4. Tạo Access Token
    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpires, // 👈 Bây giờ là SỐ
    });

    // 5. Tạo Refresh Token
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpires, // 👈 Bây giờ là SỐ
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async _updateRefreshTokenHash(userId: string, refreshToken: string) {
    const salt = await bcrypt.genSalt(10);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);
    
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }


  async login(user: any) {
    // 1. Tạo cả 2 token
    const tokens = await this._generateTokens(user.id, user.email, user.role);

    // 2. Hash và lưu Refresh Token vào DB
    await this._updateRefreshTokenHash(user.id, tokens.refresh_token);

    // 3. Trả về tokens và user data cho client
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    
    if (!user) {
      // Don't reveal if email exists for security reasons
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    // Generate reset code
    const resetPasswordCode = uuidv4();
    const resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    // Update user with reset code
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordCode,
        resetPasswordExpiresAt,
      },
    });

    // Send reset password email
    await this.emailService.sendPasswordReset(user, resetPasswordCode);

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  async resetPassword(resetCode: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { resetPasswordCode: resetCode },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Check if reset code is expired
    if (user.resetPasswordExpiresAt && user.resetPasswordExpiresAt < new Date()) {
      throw new BadRequestException('Reset code has expired');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password and clear reset code
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetPasswordCode: null,
        resetPasswordExpiresAt: null,
      },
    });

    return { message: 'Password reset successfully' };
  }
}