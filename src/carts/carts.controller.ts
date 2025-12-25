import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ValidationPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('carts')
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  /**
   * Get user's cart
   * GET /api/carts
   */
  @Get()
  async getCart(@Request() req) {
    const userId = req.user.id;
    return this.cartsService.getCart(userId);
  }

  /**
   * Add item to cart
   * POST /api/carts/items
   */
  @Post('items')
  async addToCart(
    @Request() req,
    @Body(ValidationPipe) dto: AddToCartDto,
  ) {
    const userId = req.user.id;
    return this.cartsService.addToCart(userId, dto);
  }

  /**
   * Update cart item quantity
   * PUT /api/carts/items/:id
   */
  @Put('items/:id')
  async updateCartItem(
    @Request() req,
    @Param('id', ParseUUIDPipe) cartItemId: string,
    @Body(ValidationPipe) dto: UpdateCartItemDto,
  ) {
    const userId = req.user.id;
    return this.cartsService.updateCartItem(userId, cartItemId, dto);
  }

  /**
   * Remove item from cart
   * DELETE /api/carts/items/:id
   */
  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  async removeFromCart(
    @Request() req,
    @Param('id', ParseUUIDPipe) cartItemId: string,
  ) {
    const userId = req.user.id;
    return this.cartsService.removeFromCart(userId, cartItemId);
  }

  /**
   * Clear cart
   * DELETE /api/carts
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async clearCart(@Request() req) {
    const userId = req.user.id;
    return this.cartsService.clearCart(userId);
  }

  /**
   * Checkout
   * POST /api/carts/checkout
   */
  @Post('checkout')
  async checkout(@Request() req) {
    const userId = req.user.id;
    return this.cartsService.checkout(userId);
  }
}

