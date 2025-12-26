import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';

@Module({
  imports: [MailerModule], // 🔥 THIS FIXES IT
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
