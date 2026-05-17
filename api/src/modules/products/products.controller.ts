import { Controller, Get, Param, Query } from '@nestjs/common'
import { ProductQueryDto } from './dto/product-query.dto'
import { ProductsService } from './products.service'

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findMany(@Query() query: ProductQueryDto) {
    return this.productsService.findMany(query)
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug)
  }
}
