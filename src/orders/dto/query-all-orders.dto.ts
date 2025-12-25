// src/orders/dto/query-all-orders.dto.ts
import { IsOptional, IsInt, Min, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

// Enum cho các field có thể sort
export enum OrderSortField {
  CREATED_AT = 'createdAt',
  TOTAL = 'total',
  STATUS = 'status',
}

// Enum cho sort order
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryAllOrdersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(OrderSortField)
  sortBy?: OrderSortField = OrderSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

