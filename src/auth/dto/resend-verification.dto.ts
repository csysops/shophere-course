// src/auth/dto/resend-verification.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}