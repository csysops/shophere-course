// src/orders/orders.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  // 1. Tiêm (Inject) PrismaService
  constructor(private prisma: PrismaService) { }

  /**
   * Create Order (Single Item - Buy Now)
   */
  async create(userId: string, input: CreateOrderDto) {
    const { productId, quantity } = input;

    // 1. Lấy thông tin sản phẩm (để biết giá)
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // 2. (Giả lập) Tính tổng tiền
    const price = Number(product.price);
    const total = price * quantity;

    // 3. 🚀 TRIỂN KHAI OUTBOX PATTERN
    //    Chúng ta dùng $transaction để đảm bảo cả hai (Order và Outbox)
    //    đều được tạo, hoặc cả hai đều thất bại (ACID).
    try {
      const newOrder = await this.prisma.$transaction(async (tx) => {
        // a. Tạo đơn hàng (B1 trong tài liệu Holy_Dev)
        const order = await tx.order.create({
          data: {
            userId: userId,
            total: total,
            status: OrderStatus.PENDING, // Trạng thái ban đầu
            items: {
              create: {
                productId: productId,
                quantity: quantity,
                price: price,
              },
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // b. Tạo sự kiện Outbox (Thay vì gọi RabbitMQ)
        const eventName = 'OrderCreatedEvent'; // Giống tài liệu Holy_Dev
        const eventPayload = {
          orderId: order.id,
          userId: order.userId,
          items: order.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
          total: order.total,
        };

        await tx.outboxEvent.create({
          data: {
            eventName: eventName,
            payload: eventPayload as unknown as Prisma.JsonObject,
          },
        });

        return order;
      });

      return newOrder;
    } catch (error) {
      // (Xử lý lỗi)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException('Failed to create order due to DB conflict');
      }
      throw new BadRequestException('Failed to create order');
    }
  }

  /**
   * Get user orders
   */
  async findUserOrders(userId: string) {
    return this.prisma.order.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc', // Đơn hàng mới nhất trước
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                price: true, // Current price
              },
            },
          },
        },
      },
    });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string, userId: string) {
    // Verify order belongs to user
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('Unauthorized to update this order');
    }

    // Validate status
    const validStatuses = ['PENDING', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid order status');
    }

    // Update order status
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: status as OrderStatus },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * ADMIN: Get all orders với sort và pagination
   */
  async getAllOrders(params: {
    page?: number;
    pageSize?: number;
    status?: OrderStatus;
    userId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { 
      page = 1, 
      pageSize = 10, 
      status, 
      userId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    // Build where clause
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (userId) {
      where.userId = userId;
    }

    // Build orderBy clause - Validate sortBy field để tránh SQL injection
    const validSortFields = ['createdAt', 'total', 'status', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';
    
    const orderBy: any = {};
    orderBy[sortField] = orderDirection;

    // Execute query with pagination và sort
    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items: orders,
    };
  }

  /**
   * ADMIN: Update order status
   */
  async updateOrderStatusAdmin(orderId: string, status: OrderStatus) {
    // Check if order exists
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Update order status
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * ADMIN: Get order details
   */
  async getOrderByIdAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}