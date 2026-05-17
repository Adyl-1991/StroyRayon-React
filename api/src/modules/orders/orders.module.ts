import { Module } from '@nestjs/common'
import { CustomersModule } from '../customers/customers.module'
import { StockModule } from '../stock/stock.module'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { WhatsappOrderService } from './whatsapp-order.service'

@Module({
  imports: [CustomersModule, StockModule],
  controllers: [OrdersController],
  providers: [OrdersService, WhatsappOrderService],
})
export class OrdersModule {}
