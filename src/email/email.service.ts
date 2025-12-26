import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendUserVerification(user: User, code: string) {
    console.log('📨 [EmailService] sendUserVerification called');
  console.log('📨 To:', user.email);
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Verify your email',
      template: 'verify', // ✅ NO ./ and NO extension
      context: {
        name: user.email,
        activationCode: code,
      },
    });
    console.log('📨 MailerService.sendMail finished');
  }

  async sendPasswordReset(user: User, resetCode: string) {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Reset your password',
      template: 'reset-password',
      context: {
        name: user.email,
        resetCode,
      },
    });
  }
}
