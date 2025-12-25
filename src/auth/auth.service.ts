import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /* ----------------------------------------
   * VALIDATE USER (LOGIN)
   * ---------------------------------------- */
  async validateUser(email: string, pass: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.usersService.findOneByEmail(email);

    if (!user || !user.passwordHash) return null;

    const passwordValid = await bcrypt.compare(pass, user.passwordHash);
    if (!passwordValid) return null;

    if (!user.isVerified) {
      throw new BadRequestException('Please verify your email before logging in');
    }

    // remove passwordHash before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  /* ----------------------------------------
   * REGISTER
   * ---------------------------------------- */
  async register(createUserDto: any) {
    try {
      return await this.usersService.create(createUserDto);
    } catch (error) {
      // ✅ HANDLE DUPLICATE EMAIL (UNIQUE CONSTRAINT)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }

      throw error;
    }
  }

  /* ----------------------------------------
   * RESEND VERIFICATION EMAIL
   * ---------------------------------------- */
  async resendVerification(email: string) {
    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    const verificationCode = uuidv4();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationCode },
    });

    await this.emailService.sendUserVerification(user, verificationCode);

    return { message: 'Verification email sent successfully' };
  }

  /* ----------------------------------------
   * VERIFY EMAIL
   * ---------------------------------------- */
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationCode: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  /* ----------------------------------------
   * TOKEN HELPERS
   * ---------------------------------------- */
  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    const accessExpires = Number(this.configService.get('JWT_ACCESS_EXPIRATION'));
    const refreshExpires = Number(this.configService.get('JWT_REFRESH_EXPIRATION'));

    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT secrets are not configured');
    }

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpires,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpires,
    });

    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hash },
    });
  }

  /* ----------------------------------------
   * LOGIN
   * ---------------------------------------- */
  async login(user: any) {
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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

  /* ----------------------------------------
   * FORGOT PASSWORD
   * ---------------------------------------- */
  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    const resetPasswordCode = uuidv4();
    const resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordCode,
        resetPasswordExpiresAt,
      },
    });

    await this.emailService.sendPasswordReset(user, resetPasswordCode);

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  /* ----------------------------------------
   * RESET PASSWORD
   * ---------------------------------------- */
  async resetPassword(resetCode: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { resetPasswordCode: resetCode },
    });

    if (!user || !user.resetPasswordExpiresAt) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    if (user.resetPasswordExpiresAt < new Date()) {
      throw new BadRequestException('Reset code has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordCode: null,
        resetPasswordExpiresAt: null,
      },
    });

    return { message: 'Password reset successfully' };
  }
}
