import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BrandsModule } from './modules/brands/brands.module'
import { CatalogModule } from './modules/catalog/catalog.module'
import { CustomersModule } from './modules/customers/customers.module'
import { HealthModule } from './modules/health/health.module'
import { OrdersModule } from './modules/orders/orders.module'
import { ProductsModule } from './modules/products/products.module'
import { StockModule } from './modules/stock/stock.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    CatalogModule,
    ProductsModule,
    BrandsModule,
    StockModule,
    OrdersModule,
    CustomersModule,
  ],
})
export class AppModule {}
