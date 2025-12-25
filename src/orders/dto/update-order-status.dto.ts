// src/orders/dto/update-order-status.dto.ts
import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsNotEmpty()
  @IsEnum(OrderStatus, { message: 'Invalid order status' })
  status: OrderStatus;
}

