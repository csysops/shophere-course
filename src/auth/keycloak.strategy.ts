import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

/**
 * Keycloak JWT Strategy
 * Validates JWT tokens issued by Keycloak using JWKS
 */
@Injectable()
export class KeycloakStrategy extends PassportStrategy(Strategy, 'keycloak') {
  constructor(private configService: ConfigService) {
    const keycloakUrl = configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
    const realm = configService.get<string>('KEYCLOAK_REALM', 'shop-realm');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: configService.get<string>('KEYCLOAK_CLIENT_ID', 'shop-backend'),
      issuer: `${keycloakUrl}/realms/${realm}`,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
      }),
    });
  }

  /**
   * Validate JWT payload
   * @param payload - The decoded JWT payload from Keycloak
   * @returns User information extracted from token
   */
  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing subject');
    }

    // Extract user information from Keycloak token
    return {
      keycloakId: payload.sub, // Keycloak user ID (UUID)
      email: payload.email,
      username: payload.preferred_username,
      firstName: payload.given_name,
      lastName: payload.family_name,
      roles: payload.realm_access?.roles || [],
      emailVerified: payload.email_verified || false,
      
      // Full token for debugging or advanced use
      _raw: payload,
    };
  }
}

