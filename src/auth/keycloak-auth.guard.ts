import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Observable, firstValueFrom } from 'rxjs';

/**
 * Keycloak Authentication Guard
 * Protects routes by validating Keycloak JWT tokens
 * Can be combined with @Public() decorator for public routes
 */
@Injectable()
export class KeycloakAuthGuard extends AuthGuard('keycloak') {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtAuthGuard: JwtAuthGuard,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    try {
      const keycloakResult = (await super.canActivate(context)) as boolean;

      const request = context.switchToHttp().getRequest();
      if (keycloakResult && request?.user) {
        return true;
      }
    } catch (error) {
      // Ignore and fall back to JWT guard
      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }
    }

    const fallbackResult = this.jwtAuthGuard.canActivate(
      context,
    ) as boolean | Promise<boolean> | Observable<boolean>;

    if (fallbackResult instanceof Promise) {
      return fallbackResult;
    }

    if (typeof fallbackResult === 'boolean') {
      return fallbackResult;
    }

    return firstValueFrom(fallbackResult);
  }
}

