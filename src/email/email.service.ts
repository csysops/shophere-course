// src/email/email.service.ts
import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(
      this.configService.get<string>('RESEND_API_KEY'),
    );
  }

  async sendUserVerification(user: User, code: string) {
    await this.resend.emails.send({
      from: 'ShopSphere <onboarding@resend.dev>',
      to: user.email,
      subject: 'Verify your email',
      html: `
        <h2>Welcome to ShopSphere</h2>
        <p>Your verification code:</p>
        <h3>${code}</h3>
        <p>Or click the link:</p>
        <a href="https://shophere-frontend.onrender.com/verify?code=${code}">
          Verify Email
        </a>
      `,
    });
  }

  async sendPasswordReset(user: User, resetCode: string) {
    await this.resend.emails.send({
      from: 'ShopSphere <onboarding@resend.dev>',
      to: user.email,
      subject: 'Reset your password',
      html: `
        <p>Reset code:</p>
        <h3>${resetCode}</h3>
      `,
    });
  }
}
