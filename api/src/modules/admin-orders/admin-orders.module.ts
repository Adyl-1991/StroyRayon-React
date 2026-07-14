import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { OrdersModule } from '../orders/orders.module'
import { AdminOrdersController } from './admin-orders.controller'
import { AdminOrdersService } from './admin-orders.service'

@Module({
  imports: [AuthModule, OrdersModule],
  controllers: [AdminOrdersController],
  providers: [AdminOrdersService],
})
export class AdminOrdersModule {}
