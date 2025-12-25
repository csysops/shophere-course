// src/events/events.controller.ts
import { Controller, Inject, Logger } from '@nestjs/common';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';
@Controller()
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(
    private prisma: PrismaService,
    @Inject('RABBITMQ_SERVICE') private rabbitClient: ClientProxy,
  ) {}

  /**
   * (Đã có) Xử lý sự kiện User
   */
  @EventPattern('user_created')
  async handleUserCreated(@Payload() data: any) {
    this.logger.log(`[SAGA] User Created: ${data.email}`);
    // (Trong tương lai, chúng ta có thể gọi EmailService ở đây)
  }

  // --- BẮT ĐẦU SAGA ĐẶT HÀNG (THEO HOLY_DEV) ---

  /**
   * BƯỚC 2: (Mô phỏng) Dịch vụ Tồn kho (Inventory Service)
   * Lắng nghe sự kiện OrderCreatedEvent
   */
 @EventPattern('OrderCreatedEvent')
  async handleOrderCreated(@Payload() data: any) {
    this.logger.log(`[SAGA-B2] Received OrderCreatedEvent for Order ${data.orderId}`);

    // --- 🚀 BẮT ĐẦU XỬ LÝ IDEMPOTENCY ---
    const eventId = data.orderId; // (Trong hệ thống thực tế, sự kiện nên có ID riêng)

    try {
      // 1. Ghi lại sự kiện ID.
      // Nếu ID này đã tồn tại, Prisma sẽ ném lỗi P2002 (Unique constraint failed)
      await this.prisma.processedEvent.create({
        data: { id: eventId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // 2. Nếu lỗi, có nghĩa là sự kiện đã được xử lý. Bỏ qua một cách an toàn.
        this.logger.warn(`[IDEMPOTENCY] Event ${eventId} already processed. Skipping.`);
        return; // Dừng xử lý
      }
      throw error; // Ném các lỗi khác
    }
    // --- 🚀 KẾT THÚC XỬ LÝ IDEMPOTENCY ---
    this.logger.log(`[SAGA-B2] InventoryService: Received OrderCreatedEvent for Order ${data.orderId}`);

    // (Code mô phỏng: Chúng ta sẽ trừ tồn kho.
    //  Nếu bạn muốn mô phỏng lỗi, hãy đặt quantity > 100)
    
    // Tìm bản ghi Inventory cho ProductId
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId: data.productId },
    });

    if (inventory && inventory.quantity >= data.quantity) {
      // Đủ hàng: Trừ tồn kho
      await this.prisma.inventory.update({
        where: { productId: data.productId },
        data: { quantity: { decrement: data.quantity } },
      });
      
      this.logger.log(`[SAGA-B2] InventoryService: Stock reserved for Order ${data.orderId}`);
      // Phát sự kiện tiếp theo (InventoryReservedEvent)
      this.rabbitClient.emit('InventoryReservedEvent', data);
    } else {
      // Hết hàng: Phát sự kiện lỗi
      this.logger.warn(`[SAGA-B2] InventoryService: Stock FAILED for Order ${data.orderId}`);
      this.rabbitClient.emit('InventoryFailedEvent', data);
    }
  }

  /**
   * BƯỚC 3: (Mô phỏng) Dịch vụ Thanh toán (Payment Service)
   * Lắng nghe sự kiện InventoryReservedEvent
   */
  @EventPattern('InventoryReservedEvent')
  async handleInventoryReserved(@Payload() data: any) {
    this.logger.log(`[SAGA-B3] PaymentService: Received InventoryReservedEvent for Order ${data.orderId}`);

    // (Code mô phỏng: Giả lập thanh toán)
    const paymentSuccess = Math.random() > 0.1; // 90% thành công

    if (paymentSuccess) {
      this.logger.log(`[SAGA-B3] PaymentService: Payment SUCCESS for Order ${data.orderId}`);
      // Phát sự kiện tiếp theo (PaymentCompletedEvent)
      this.rabbitClient.emit('PaymentCompletedEvent', data);
    } else {
      this.logger.error(`[SAGA-B3] PaymentService: Payment FAILED for Order ${data.orderId}`);
      // Phát sự kiện lỗi
      this.rabbitClient.emit('PaymentFailedEvent', data);
    }
  }

  /**
   * BƯỚC 4: (Mô phỏng) Dịch vụ Đơn hàng (Order Service) - Hoàn tất
   * Lắng nghe sự kiện PaymentCompletedEvent
   */
  @EventPattern('PaymentCompletedEvent')
  async handlePaymentCompleted(@Payload() data: any) {
    this.logger.log(`[SAGA-B4] OrderService: Received PaymentCompletedEvent. Order ${data.orderId} COMPLETED.`);
    
    // Cập nhật trạng thái Order thành COMPLETED
    await this.prisma.order.update({
      where: { id: data.orderId },
      data: { status: OrderStatus.COMPLETED },
    });
    
    // (Gửi email thông báo cho khách hàng ở đây...)
    // this.rabbitClient.emit('OrderCompletedEvent', data); // (để NotificationService lắng nghe)
  }

  /**
   * BƯỚC X: (Mô phỏng) Xử lý Lỗi (Compensating Transactions)
   * Lắng nghe các sự kiện lỗi
   */
  @EventPattern('InventoryFailedEvent')
  @EventPattern('PaymentFailedEvent')
  async handleOrderFailed(@Payload() data: any) {
    this.logger.warn(`[SAGA-COMP] Compensation: Received FAILED event for Order ${data.orderId}.`);

    // Cập nhật trạng thái Order thành CANCELLED
    await this.prisma.order.update({
      where: { id: data.orderId },
      data: { status: OrderStatus.CANCELLED },
    });
    
    // (Nếu đây là PaymentFailedEvent, chúng ta cần phát một sự kiện
    //  để InventoryService "trả lại" (release) hàng tồn kho đã giữ)
  }
}