// src/orders/orders.controller.ts
import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KeycloakAuthGuard } from '../auth/keycloak-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryAllOrdersDto } from './dto/query-all-orders.dto';
import { UsersService } from '../users/users.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
  ) {}

  private async resolveAuthenticatedUser(req: any) {
    if (!req?.user) {
      throw new UnauthorizedException('Missing authentication context');
    }

    if (req.user.keycloakId) {
      const user = await this.usersService.syncUserFromKeycloak({
        keycloakId: req.user.keycloakId,
        email: req.user.email,
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        emailVerified: req.user.emailVerified,
        roles: req.user.roles,
      });

      // Ensure downstream consumers can rely on id/role
      req.user.id = user.id;
      req.user.role = user.role;

      return user;
    }

    if (req.user.id) {
      const user = await this.usersService.findOneById(req.user.id);
      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }
      return user;
    }

    throw new UnauthorizedException('Unsupported authentication payload');
  }

  /**
   * Create Order with Keycloak Authentication
   * Supports both JWT and Keycloak tokens
   */
  @UseGuards(KeycloakAuthGuard) // 👈 Use Keycloak Guard for authentication
  @Post()
  async create(
    @Request() req, // 👈 Contains Keycloak user from token
    @Body(ValidationPipe) createOrderDto: CreateOrderDto,
  ) {
    const user = await this.resolveAuthenticatedUser(req);

    // Create order with synced user ID
    return this.ordersService.create(user.id, createOrderDto);
  }

  /**
   * Get all orders for current user (Keycloak)
   */
  @UseGuards(KeycloakAuthGuard)
  @Get('my-orders')
  async getMyOrders(@Request() req) {
    const user = await this.resolveAuthenticatedUser(req);

    return this.ordersService.findUserOrders(user.id);
  }

  /**
   * Update order status (for payment completion)
   */
  @UseGuards(KeycloakAuthGuard)
  @Put(':id/status')
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body('status') status: string,
    @Request() req,
  ) {
    const user = await this.resolveAuthenticatedUser(req);

    return this.ordersService.updateOrderStatus(orderId, status, user.id);
  }

  /**
   * ADMIN: Get all orders with pagination and filters
   * Uses Keycloak roles for authorization
   */
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/all')
  async getAllOrders(
    @Query(new ValidationPipe({ transform: true })) query: QueryAllOrdersDto,
  ) {
    return this.ordersService.getAllOrders(query);
  }

  /**
   * ADMIN: Get order detail by id
   */
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/:id')
  async getOrderByIdAdmin(@Param('id') orderId: string) {
    return this.ordersService.getOrderByIdAdmin(orderId);
  }

  /**
   * ADMIN: Update order status
   * Uses Keycloak roles for authorization
   */
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:id/status')
  async updateOrderStatusAdmin(
    @Param('id') orderId: string,
    @Body(ValidationPipe) updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatusAdmin(orderId, updateOrderStatusDto.status);
  }
}