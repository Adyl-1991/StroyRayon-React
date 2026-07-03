import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { AdminAuthGuard } from '../auth/admin-auth.guard'
import { AdminIdentity, assertAdminPermission } from '../auth/admin-permissions'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import { AdminProductsService } from './admin-products.service'
import { AdminProductsQueryDto } from './dto/admin-products-query.dto'
import { CreateAdminProductDto } from './dto/create-admin-product.dto'
import { UpdateProductActiveDto } from './dto/update-product-active.dto'
import { UpdateAdminProductDto } from './dto/update-admin-product.dto'
import { UpdateProductNoteDto } from './dto/update-product-note.dto'
import { UpdateProductPriceDto } from './dto/update-product-price.dto'
import { UpdateProductStockDto } from './dto/update-product-stock.dto'

const productUploadDir = join(process.cwd(), 'uploads', 'products')
const maxProductImageSize = 5 * 1024 * 1024
const productImageMimeTypes: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

const productImageUpload = FileInterceptor('file', {
  limits: { fileSize: maxProductImageSize },
  fileFilter: (_request, file, callback) => {
    if (!productImageMimeTypes[file.mimetype]) {
      callback(new BadRequestException('Only JPG, PNG, WEBP and GIF images are allowed'), false)
      return
    }
    callback(null, true)
  },
})

@Controller('admin/products')
@UseGuards(AdminAuthGuard)
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get()
  list(@Query() query: AdminProductsQueryDto, @CurrentAdmin() admin: AdminIdentity) {
    assertAdminPermission(admin, 'products:view')
    return this.adminProductsService.list(query)
  }

  @Get('options')
  options(@CurrentAdmin() admin: AdminIdentity) {
    assertAdminPermission(admin, 'products:view')
    return this.adminProductsService.options()
  }

  @Post()
  create(@Body() dto: CreateAdminProductDto, @CurrentAdmin() admin: AdminIdentity) {
    assertAdminPermission(admin, 'products:create')
    return this.adminProductsService.create(dto, admin)
  }

  @Post('images')
  @UseInterceptors(productImageUpload)
  async uploadImage(
    @UploadedFile() file: { buffer?: Buffer; mimetype: string; originalname: string; size: number },
    @Req() request: { protocol: string; get(name: string): string | undefined },
    @CurrentAdmin() admin: AdminIdentity,
  ) {
    assertAdminPermission(admin, 'products:upload')
    if (!file?.buffer) throw new BadRequestException('Image file is required')

    const extension = productImageMimeTypes[file.mimetype]
    if (!extension) {
      throw new BadRequestException('Only JPG, PNG, WEBP and GIF images are allowed')
    }

    await mkdir(productUploadDir, { recursive: true })
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`
    await writeFile(join(productUploadDir, filename), file.buffer)

    const publicPath = `/uploads/products/${filename}`
    const configuredOrigin = process.env.PUBLIC_API_ORIGIN?.replace(/\/+$/g, '')
    const requestOrigin = `${request.protocol}://${request.get('host')}`
    return {
      src: `${configuredOrigin || requestOrigin}${publicPath}`,
      path: publicPath,
      filename,
      originalName: file.originalname,
      size: file.size,
    }
  }

  @Get(':id/audit-log')
  auditLog(
    @Param('id') id: string,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentAdmin() admin: AdminIdentity,
  ) {
    assertAdminPermission(admin, 'products:audit:view')
    return this.adminProductsService.auditLog(id, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    })
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentAdmin() admin: AdminIdentity) {
    assertAdminPermission(admin, 'products:view')
    return this.adminProductsService.detail(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminProductDto, @CurrentAdmin() admin: AdminIdentity) {
    return this.adminProductsService.update(id, dto, admin)
  }

  @Patch(':id/price')
  updatePrice(@Param('id') id: string, @Body() dto: UpdateProductPriceDto, @CurrentAdmin() admin: AdminIdentity) {
    assertAdminPermission(admin, 'products:commercial')
    return this.adminProductsService.updatePrice(id, dto.price, admin)
  }

  @Patch(':id/stock')
  updateStock(@Param('id') id: string, @Body() dto: UpdateProductStockDto, @CurrentAdmin() admin: AdminIdentity) {
    assertAdminPermission(admin, 'products:commercial')
    return this.adminProductsService.updateStock(id, dto.quantity, dto.stockStatus, admin)
  }

  @Patch(':id/active')
  updateActive(@Param('id') id: string, @Body() dto: UpdateProductActiveDto, @CurrentAdmin() admin: AdminIdentity) {
    assertAdminPermission(admin, 'products:active')
    return this.adminProductsService.updateActive(id, dto.isActive, admin)
  }

  @Patch(':id/note')
  updateNote(@Param('id') id: string, @Body() dto: UpdateProductNoteDto, @CurrentAdmin() admin: AdminIdentity) {
    assertAdminPermission(admin, 'products:content')
    return this.adminProductsService.updateNote(id, dto.note, admin)
  }
}
