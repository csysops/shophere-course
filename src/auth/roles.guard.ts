// src/auth/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Lấy các vai trò (roles) cần thiết từ @Roles decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Nếu endpoint không yêu cầu vai trò nào, cho phép truy cập
    if (!requiredRoles) {
      return true;
    }

    // 3. Lấy thông tin user từ request (đã được JwtAuthGuard đính vào)
    const { user } = context.switchToHttp().getRequest();

    // 4. Kiểm tra xem vai trò của user có nằm trong danh sách vai trò
    //    yêu cầu hay không
    if (!user) {
      return false;
    }

    const normalizedRoles = new Set<string>();

    if (user.role) {
      normalizedRoles.add(String(user.role).toUpperCase());
    }

    if (Array.isArray(user.roles)) {
      user.roles
        .filter(Boolean)
        .map((role: string) => role.toUpperCase())
        .forEach((role) => normalizedRoles.add(role));
    }

    return requiredRoles.some((role) => normalizedRoles.has(role.toUpperCase()));
  }
}