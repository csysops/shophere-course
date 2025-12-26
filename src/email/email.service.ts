import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';

@Injectable()
export class EmailService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  private getBaseUrl(): string {
    // Sử dụng BASE_URL từ env, nếu không có thì tự động detect
    const baseUrl = this.configService.get<string>('BASE_URL');

    if (baseUrl) {
      return baseUrl;
    }

    // Auto-detect cho production (Render, Heroku, etc.)
    // Render chỉ cho phép HTTP trên port 80/443
    if (process.env.NODE_ENV === 'production') {
      return 'https://your-render-app-url.onrender.com'; // Thay thế bằng URL thực tế của bạn
    }

    // Development fallback
    const port = process.env.PORT || '3000';
    return `http://localhost:${port}`;
  }

  // Gửi email xác thực
  async sendUserVerification(user: User, code: string) {
    const baseUrl = this.getBaseUrl();

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Chào mừng đến ShopSphere! Xác thực Email của bạn',
      template: './verify',
      context: {
        name: user.email,
        activationCode: code,
        baseUrl: baseUrl,
      },
    });
  }

  // Gửi email đặt lại mật khẩu
  async sendPasswordReset(user: User, resetCode: string) {
    const baseUrl = this.getBaseUrl();

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Đặt lại mật khẩu ShopSphere',
      template: './reset-password',
      context: {
        name: user.email,
        resetCode: resetCode,
        baseUrl: baseUrl,
      },
    });
  }
}
