// src/outbox/processor.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from "../../../prisma/prisma.service"

@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger(OutboxProcessorService.name);

  constructor(
    private prisma: PrismaService,
    @Inject('RABBITMQ_SERVICE') private rabbitClient: ClientProxy,
  ) {}

  /**
   * MỚI: Chạy 5 giây một lần
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleOutboxEvents() {
    this.logger.log('Polling for outbox events...');

    // 1. Tìm các sự kiện chưa được xử lý
    const eventsToProcess = await this.prisma.outboxEvent.findMany({
      where: {
        processedAt: null, // Chỉ lấy các sự kiện chưa được xử lý
      },
      orderBy: {
        createdAt: 'asc', // Xử lý theo thứ tự
      },
      take: 10, // Xử lý 10 sự kiện mỗi lần
    });

    if (eventsToProcess.length === 0) {
      this.logger.log('No new events to process.');
      return;
    }

    this.logger.log(`Found ${eventsToProcess.length} events to publish.`);

    // 2. Lặp qua và gửi
    for (const event of eventsToProcess) {
      try {
        // 3. Gửi đến RabbitMQ (một cách đáng tin cậy)
        // Dùng 'emit' (send và quên)
        this.rabbitClient.emit(event.eventName, event.payload);

        // 4. Đánh dấu là đã xử lý
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            processedAt: new Date(),
          },
        });

        this.logger.log(`Successfully processed event ${event.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to process event ${event.id}: ${error.message}`,
        );
        // (Trong một hệ thống thực tế, chúng ta sẽ có logic thử lại (retry))
      }
    }
  }
}