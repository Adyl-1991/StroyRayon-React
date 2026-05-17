import { Controller, Get, Query } from '@nestjs/common'
import { CatalogService } from './catalog.service'
import { CatalogNodeQueryDto } from './dto/catalog-node-query.dto'

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('tree')
  getTree() {
    return this.catalogService.getTree()
  }

  @Get('node')
  getNode(@Query() query: CatalogNodeQueryDto) {
    return this.catalogService.getNodeByPath(query.path)
  }
}
