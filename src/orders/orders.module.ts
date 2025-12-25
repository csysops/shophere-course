// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule], // Import UsersModule for Keycloak user sync
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}