import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { AdminAuthGuard } from '../auth/admin-auth.guard'
import { AdminProductsService } from './admin-products.service'
import { AdminProductsQueryDto } from './dto/admin-products-query.dto'
import { CreateAdminProductDto } from './dto/create-admin-product.dto'
import { UpdateProductActiveDto } from './dto/update-product-active.dto'
import { UpdateProductNoteDto } from './dto/update-product-note.dto'
import { UpdateProductPriceDto } from './dto/update-product-price.dto'
import { UpdateProductStockDto } from './dto/update-product-stock.dto'

@Controller('admin/products')
@UseGuards(AdminAuthGuard)
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get()
  list(@Query() query: AdminProductsQueryDto) {
    return this.adminProductsService.list(query)
  }

  @Get('options')
  options() {
    return this.adminProductsService.options()
  }

  @Post()
  create(@Body() dto: CreateAdminProductDto) {
    return this.adminProductsService.create(dto)
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.adminProductsService.detail(id)
  }

  @Patch(':id/price')
  updatePrice(@Param('id') id: string, @Body() dto: UpdateProductPriceDto) {
    return this.adminProductsService.updatePrice(id, dto.price)
  }

  @Patch(':id/stock')
  updateStock(@Param('id') id: string, @Body() dto: UpdateProductStockDto) {
    return this.adminProductsService.updateStock(id, dto.quantity, dto.stockStatus)
  }

  @Patch(':id/active')
  updateActive(@Param('id') id: string, @Body() dto: UpdateProductActiveDto) {
    return this.adminProductsService.updateActive(id, dto.isActive)
  }

  @Patch(':id/note')
  updateNote(@Param('id') id: string, @Body() dto: UpdateProductNoteDto) {
    return this.adminProductsService.updateNote(id, dto.note)
  }
}
