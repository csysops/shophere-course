import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  // Gửi email xác thực
  async sendUserVerification(user: User, code: string) {
  console.log('📨 [EmailService] sendUserVerification called');
  console.log('📨 To:', user.email);
  await this.mailerService.sendMail({
    to: user.email,
    subject: 'Verify email',
    text: `Your verification code is: ${code}`,
  });
  // await this.mailerService.sendMail({
  //   to: user.email,
  //   subject: 'Verify email',
  //   template: './verify',
  //   context: {
  //     name: user.email,
  //     activationCode: code,
  //   },
  // });

  console.log('📨 MailerService.sendMail finished');
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

