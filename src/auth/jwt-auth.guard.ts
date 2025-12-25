// src/auth/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Override canActivate để thêm input validation và error handling tốt hơn
   */
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    // --- INPUT VALIDATION: Kiểm tra format của Authorization header ---
    
    // 1. Kiểm tra Authorization header có tồn tại không
    if (!authHeader) {
      throw new UnauthorizedException('Không có token xác thực. Vui lòng đăng nhập lại.');
    }

    // 2. Kiểm tra format: phải bắt đầu bằng "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Định dạng token không hợp lệ. Token phải bắt đầu bằng "Bearer ".');
    }

    // 3. Extract token và kiểm tra không rỗng
    const token = authHeader.substring(7); // Bỏ "Bearer " prefix
    
    if (!token || token.trim().length === 0) {
      throw new UnauthorizedException('Token không được để trống.');
    }

    // 4. Kiểm tra format JWT cơ bản (phải có 3 phần được phân cách bởi dấu chấm)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new UnauthorizedException('Định dạng JWT không hợp lệ. Token phải có 3 phần.');
    }

    // 5. Kiểm tra các phần không rỗng
    if (!tokenParts[0] || !tokenParts[1] || !tokenParts[2]) {
      throw new UnauthorizedException('Token không đầy đủ. Thiếu header, payload hoặc signature.');
    }

    // --- KẾT THÚC INPUT VALIDATION ---

    // Gọi parent canActivate để verify signature và validate payload
    return super.canActivate(context);
  }

  /**
   * Override handleRequest để cải thiện error messages
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Nếu có lỗi từ Passport
    if (err) {
      throw err;
    }

    // Nếu không có user (token không hợp lệ hoặc đã hết hạn)
    if (!user) {
      // Xử lý các loại lỗi khác nhau từ Passport
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token đã hết hạn. Vui lòng đăng nhập lại.');
      }
      
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token không hợp lệ. Chữ ký không đúng hoặc token đã bị chỉnh sửa.');
      }

      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token chưa có hiệu lực.');
      }

      // Lỗi chung
      throw new UnauthorizedException('Token xác thực không hợp lệ. Vui lòng đăng nhập lại.');
    }

    return user;
  }
}