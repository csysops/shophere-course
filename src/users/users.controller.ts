// src/users/users.controller.ts
import { Controller, Get, UseGuards, Request, Patch, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KeycloakAuthGuard } from '../auth/keycloak-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current user profile (JWT or Keycloak)
   * Works with both authentication methods
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard) // Can also use KeycloakAuthGuard
  async getProfile(@Request() req) {
    return this.usersService.findOneById(req.user.id);
  }

  /**
   * Backwards compatible alias for profile endpoint
   * GET /api/v1/users/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req) {
    return this.usersService.findOneById(req.user.id);
  }

  /**
   * Get user by Keycloak ID
   * Used by other services to fetch user info from Keycloak token
   */
  @Get('keycloak/:sub')
  @UseGuards(KeycloakAuthGuard)
  async getUserByKeycloakId(@Request() req) {
    const keycloakId = req.params.sub;
    const keycloakUser = req.user; // From KeycloakStrategy

    // Auto-sync user from Keycloak to DB
    const user = await this.usersService.syncUserFromKeycloak({
      keycloakId: keycloakUser.keycloakId,
      email: keycloakUser.email,
      username: keycloakUser.username,
      firstName: keycloakUser.firstName,
      lastName: keycloakUser.lastName,
      emailVerified: keycloakUser.emailVerified,
      roles: keycloakUser.roles,
    });

    return user;
  }

  /**
   * Update user profile
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard) // Can also use KeycloakAuthGuard
  async updateProfile(
    @Request() req,
    @Body() updateData: { firstName?: string; lastName?: string; avatar?: string },
  ) {
    return this.usersService.updateProfile(req.user.id, updateData);
  }

  /**
   * Backwards compatible alias for profile update endpoint
   * PATCH /api/v1/users/me
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @Request() req,
    @Body() updateData: { firstName?: string; lastName?: string; avatar?: string },
  ) {
    return this.usersService.updateProfile(req.user.id, updateData);
  }
}
