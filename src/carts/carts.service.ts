import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartResponseDto, CartItemResponseDto } from './dto/cart-response.dto';

@Injectable()
export class CartsService {
  constructor(private prisma: PrismaService) { }

  /**
   * Get or create user's cart
   */
  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        cartItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          cartItems: {
            include: {
              product: true,
            },
          },
        },
      });
    }

    return cart;
  }

  /**
   * Map Cart entity to CartResponseDto
   */
  private toCartResponseDto(cart: any): CartResponseDto {
    const items: CartItemResponseDto[] = cart.cartItems.map((item) => ({
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      productPrice: Number(item.product.price),
      productImageUrl: item.product.imageUrl,
      quantity: item.quantity,
      subtotal: Number(item.product.price) * item.quantity,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      totalItems,
      totalPrice,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  /**
   * Get user's cart
   */
  async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    return this.toCartResponseDto(cart);
  }

  /**
   * Add item to cart
   */
  async addToCart(
    userId: string,
    dto: AddToCartDto,
  ): Promise<CartResponseDto> {
    const { productId, quantity } = dto;

    // Check if product exists and is not deleted
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      include: { inventory: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check inventory
    if (product.inventory && product.inventory.quantity < quantity) {
      throw new BadRequestException(
        `Only ${product.inventory.quantity} items available in stock`,
      );
    }

    // Get or create cart
    const cart = await this.getOrCreateCart(userId);

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;

      // Check inventory again
      if (product.inventory && product.inventory.quantity < newQuantity) {
        throw new BadRequestException(
          `Only ${product.inventory.quantity} items available in stock`,
        );
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      // Create new cart item
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    // Return updated cart
    return this.getCart(userId);
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(
    userId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const { quantity } = dto;

    // Find cart item
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
        product: {
          include: { inventory: true },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Verify ownership
    if (cartItem.cart.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    // Check inventory
    if (
      cartItem.product.inventory &&
      cartItem.product.inventory.quantity < quantity
    ) {
      throw new BadRequestException(
        `Only ${cartItem.product.inventory.quantity} items available in stock`,
      );
    }

    // Update quantity
    await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(
    userId: string,
    cartItemId: string,
  ): Promise<CartResponseDto> {
    // Find cart item
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Verify ownership
    if (cartItem.cart.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    // Delete cart item
    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return this.getCart(userId);
  }

  /**
   * Clear cart
   */
  async clearCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);

    // Delete all cart items
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCart(userId);
  }

  /**
   * Checkout - Convert cart to order(s)
   */
  async checkout(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        cartItems: {
          include: {
            product: {
              include: { inventory: true },
            },
          },
        },
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Validate inventory for all items first
    for (const item of cart.cartItems) {
      if (
        item.product.inventory &&
        item.product.inventory.quantity < item.quantity
      ) {
        throw new BadRequestException(
          `Insufficient stock for ${item.product.name}`,
        );
      }
    }

    // Calculate total order value
    const total = cart.cartItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    // Create order using transaction with outbox pattern
    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Create Order with OrderItems
      const newOrder = await tx.order.create({
        data: {
          userId,
          total,
          status: 'PENDING',
          items: {
            create: cart.cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price, // Snapshot price
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 2. Create outbox event
      await tx.outboxEvent.create({
        data: {
          eventName: 'OrderCreatedEvent',
          payload: {
            orderId: newOrder.id,
            userId: newOrder.userId,
            items: newOrder.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
            total: newOrder.total,
          },
        },
      });

      // 3. Deduct inventory for all items
      for (const item of cart.cartItems) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            quantity: { decrement: item.quantity },
          },
        });
      }

      // 4. Clear cart after successful checkout
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    });

    return {
      message: 'Checkout successful',
      orders: [order], // Return as array for frontend compatibility (initially)
    };
  }
}

