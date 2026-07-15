import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminBrandsController, BrandsController } from './brands.controller'
import { BrandsService } from './brands.service'

@Module({
  imports: [AuthModule],
  controllers: [BrandsController, AdminBrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
