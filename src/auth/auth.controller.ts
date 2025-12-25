import { AuthService } from '../auth/auth.service';
import { LocalAuthGuard } from '../auth/local-auth.guard'; 
import { Controller, Post, UseGuards, Request, Body, ValidationPipe, Get, Query } from '@nestjs/common'; 
import { ResendVerificationDto } from './dto/resend-verification.dto'; 
import { CreateUserDto } from '../users/dto/create-user.dto';
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @UseGuards(LocalAuthGuard) // 👈 Áp dụng Guard
  @Post('login')
  async login(@Request() req) {
 
    return this.authService.login(req.user);
  }
  
  @Get('verify-email')
  async verifyEmail(@Query('code') code: string) {
    return this.authService.verifyEmail(code);
  }

  @Post('resend-verification')
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerification(resendDto.email);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { resetCode: string; newPassword: string }) {
    return this.authService.resetPassword(body.resetCode, body.newPassword);
  }
}