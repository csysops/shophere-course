// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    
    // --- VALIDATION: Kiểm tra JWT Secret ---
    // 1. Lấy secret từ ConfigService (phải dùng JWT_ACCESS_SECRET để match với auth.module.ts)
    const secret = configService.get<string>('JWT_ACCESS_SECRET');

    // 2. Kiểm tra secret có tồn tại không
    if (!secret) {
      throw new Error('FATAL_ERROR: JWT_ACCESS_SECRET is not defined in .env file');
    }

    // 3. Kiểm tra độ mạnh của secret (ít nhất 32 ký tự để đảm bảo bảo mật)
    if (secret.length < 32) {
      throw new Error('FATAL_ERROR: JWT_ACCESS_SECRET must be at least 32 characters long for security');
    }
    // --- KẾT THÚC VALIDATION ---

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret, // 👈 Sử dụng secret đã được validate
      // Thêm options để validate tốt hơn
      algorithms: ['HS256'], // Chỉ chấp nhận HS256 algorithm
    });
  }

  /**
   * Validate JWT payload sau khi token được verify signature
   * Đây là lớp validation thứ 2 sau khi signature đã được verify
   */
  async validate(payload: any) {
    // --- INPUT VALIDATION: Kiểm tra các trường bắt buộc trong payload ---
    
    // 1. Kiểm tra subject (user ID) - BẮT BUỘC
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing subject (sub)');
    }

    // 2. Kiểm tra email - BẮT BUỘC
    if (!payload.email || typeof payload.email !== 'string') {
      throw new UnauthorizedException('Invalid token: missing or invalid email');
    }

    // 3. Kiểm tra role - BẮT BUỘC
    if (!payload.role || typeof payload.role !== 'string') {
      throw new UnauthorizedException('Invalid token: missing or invalid role');
    }

    // 4. Kiểm tra role hợp lệ (chỉ chấp nhận các role được định nghĩa)
    const validRoles = ['ADMIN', 'STAFF', 'CUSTOMER'];
    if (!validRoles.includes(payload.role.toUpperCase())) {
      throw new UnauthorizedException(`Invalid token: invalid role '${payload.role}'`);
    }

    // 5. Kiểm tra expiration (nếu có trong payload)
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Invalid token: token has expired');
    }

    // --- KẾT THÚC INPUT VALIDATION ---

    // Trả về user object đã được validate
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role.toUpperCase(), // Đảm bảo role là uppercase
    };
  }
}