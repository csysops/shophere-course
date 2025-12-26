// src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { User } from '@prisma/client';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is not defined');
    }

    sgMail.setApiKey(apiKey);
  }

  async sendUserVerification(user: User, code: string) {
    this.logger.log(`📨 Sending verification email to ${user.email}`);

    await sgMail.send({
      to: user.email,
      from: this.configService.get<string>('SENDGRID_FROM_EMAIL')!,
      subject: 'Verify your email',
      html: `
        <h2>Welcome to ShopSphere</h2>
        <p>Your verification code:</p>
        <h3>${code}</h3>
        <p>Or click the link below:</p>
        <a href="https://shophere-frontend.onrender.com/verify?code=${code}">
          Verify Email
        </a>
      `,
    });
  }

  async sendPasswordReset(user: User, resetCode: string) {
    this.logger.log(`📨 Sending password reset email to ${user.email}`);

    await sgMail.send({
      to: user.email,
      from: this.configService.get<string>('SENDGRID_FROM_EMAIL')!,
      subject: 'Reset your password',
      html: `
        <p>You requested a password reset.</p>
        <h3>${resetCode}</h3>
        <p>If you didn’t request this, ignore this email.</p>
      `,
    });
  }
}
