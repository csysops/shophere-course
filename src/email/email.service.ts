import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { User } from '@prisma/client';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(
      this.configService.get<string>('RESEND_API_KEY')!,
    );
  }

  async sendUserVerification(user: User, code: string) {
    console.log('📨 Sending verification email via Resend');

    // await this.resend.emails.send({
    //   from: this.configService.get('EMAIL_FROM')!,
    //   to: user.email,
    //   subject: 'Verify your email',
    //   html: `
    //     <h2>Welcome to ShopSphere</h2>
    //     <p>Click the link below to verify your email:</p>
    //     <a href="https://shophere-frontend.onrender.com/verify-email?code=${code}">
    //       Verify Email
    //     </a>
    //   `,
    // });
    await this.resend.emails.send({
          from: 'Acme <onboarding@resend.dev>',
          to: ['dat.pt204@gmail.com'],
          subject: 'hello world',
          html: '<p>it works!</p>',
          });
    console.log('✅ Verification email sent');
  }

  async sendPasswordReset(user: User, resetCode: string) {
    await this.resend.emails.send({
      from: this.configService.get('EMAIL_FROM')!,
      to: user.email,
      subject: 'Reset your password',
      html: `
        <p>Reset your password:</p>
        <a href="https://shophere-frontend.onrender.com/reset-password?code=${resetCode}">
          Reset Password
        </a>
      `,
    });
  }
}


