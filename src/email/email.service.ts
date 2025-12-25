import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  // Gửi email xác thực
  async sendUserVerification(user: User, code: string) {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Chào mừng đến ShopSphere! Xác thực Email của bạn',
      template: './verify', 
      context: {
        name: user.email, 
        activationCode: code,
      },
    });
  }

  // Gửi email đặt lại mật khẩu
  async sendPasswordReset(user: User, resetCode: string) {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Đặt lại mật khẩu ShopSphere',
      template: './reset-password',
      context: {
        name: user.email,
        resetCode: resetCode,
      },
    });
  }
}