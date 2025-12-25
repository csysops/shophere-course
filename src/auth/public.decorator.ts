import { SetMetadata } from '@nestjs/common';

/**
 * Public Decorator
 * Marks a route as public (bypasses Keycloak authentication)
 * 
 * @example
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 */
export const Public = () => SetMetadata('isPublic', true);

