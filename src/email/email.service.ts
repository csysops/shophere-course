import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  // Gửi email xác thực
//   async sendUserVerification(user: User, code: string) {
//   console.log('📨 [EmailService] sendUserVerification called');
//   console.log('📨 To:', user.email);
  
//   await this.mailerService.sendMail({
//     to: user.email,
//     subject: 'Verify email',
//     template: './verify',
//     context: {
//       name: user.email,
//       activationCode: code,
//     },
//   });

//   console.log('📨 MailerService.sendMail finished');
// }

async sendUserVerification(user: User, code: string) {
  const templatePath = join(
    process.cwd(),
    'dist',
    'email',
    'templates',
    'verify.hbs',
  );

  console.log('📁 Checking template path:', templatePath);
  console.log('📁 Exists?', fs.existsSync(templatePath));

  await this.mailerService.sendMail({
    to: user.email,
    subject: 'Verify email',
    template: 'verify',
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


