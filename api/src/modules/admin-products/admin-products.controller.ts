import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { AdminAuthGuard } from '../auth/admin-auth.guard'
import { AdminIdentity, assertAdminPermission } from '../auth/admin-permissions'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import { getMaxProductImageSize, isProductImageMimeType, StorageService } from '../storage/storage.service'
import { AdminProductsService } from './admin-products.service'
import { AdminProductsQueryDto } from './dto/admin-products-query.dto'
import { CreateAdminProductVariantDto, UpdateAdminProductVariantDto } from './dto/admin-product-variant.dto'
import { CreateAdminProductDto } from './dto/create-admin-product.dto'
import { ReorderProductImagesDto, UpdateProductImageDto } from './dto/product-image-gallery.dto'
import { SaveProductDraftDto } from './dto/product-draft.dto'
import { UpdateProductActiveDto } from './dto/update-product-active.dto'
import { UpdateAdminProductDto } from './dto/update-admin-product.dto'
import { UpdateProductNoteDto } from './dto/update-product-note.dto'
import { UpdateProductPriceDto } from './dto/update-product-price.dto'
import { UpdateProductStockDto } from './dto/update-product-stock.dto'

const productImageUpload = FileInterceptor('file', {
  limits: { fileSize: getMaxProductImageSize() },
  fileFilter: (_request, file, callback) => {
    if (!isProductImageMimeType(file.mimetype)) {
      callback(new BadRequestException('Only JPG, PNG and WEBP images are allowed'), false)
      return
    }
    callback(null, true)
  },
})

@Controller('admin/products')
@UseGuards(AdminAuthGuard)
export class AdminProductsController {
  constructor(
    private readonly adminProductsService: AdminProductsService,
    private readonly storageService: StorageService,
  ) {}

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
    const requestOrigin = `${request.protocol}://${request.get('host')}`
    return this.storageService.uploadProductImage(file, requestOrigin)
  }

  @Post(':id/images')
  @UseInterceptors(productImageUpload)
  async uploadProductImage(
    @Param('id') id: string,
    @UploadedFile() file: { buffer?: Buffer; mimetype: string; originalname: string; size: number },
    @Req() request: { protocol: string; get(name: string): string | undefined },
    @CurrentAdmin() admin: AdminIdentity,
  ) {
    assertAdminPermission(admin, 'products:upload')
    assertAdminPermission(admin, 'products:content')
    const requestOrigin = `${request.protocol}://${request.get('host')}`
    const stored = await this.storageService.uploadProductImage(file, requestOrigin)
    try {
      return await this.adminProductsService.addImage(id, stored, admin)
    } catch (error) {
      await this.storageService.deleteObject(stored.driver, stored.key).catch(() => undefined)
      throw error
    }
  }

  @Patch(':id/images/reorder')
  reorderProductImages(
    @Param('id') id: string,
    @Body() dto: ReorderProductImagesDto,
    @CurrentAdmin() admin: AdminIdentity,
  ) {
    assertAdminPermission(admin, 'products:content')
    return this.adminProductsService.reorderImages(id, dto, admin)
  }

  @Patch(':id/images/:imageId')
  updateProductImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateProductImageDto,
    @CurrentAdmin() admin: AdminIdentity,
  ) {
    assertAdminPermission(admin, 'products:content')
    return this.adminProductsService.updateImage(id, imageId, dto, admin)
  }

  @Delete(':id/images/:imageId')
  deleteProductImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentAdmin() admin: AdminIdentity,
  ) {
    assertAdminPermission(admin, 'products:content')
    return this.adminProductsService.deleteImage(id, imageId, this.storageService, admin)
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

  @Get(':id/draft')
  draft(@Param('id') id: string, @CurrentAdmin() admin: AdminIdentity) {
    assertAdminPermission(admin, 'products:view')
    return this.adminProductsService.draft(id)
  }

  @Patch(':id/draft')
  saveDraft(
    @Param('id') id: string,
    @Body() dto: SaveProductDraftDto,
    @CurrentAdmin() admin: AdminIdentity,
  ) {
    return this.adminProductsService.saveDraft(id, dto, admin)
  }

  @Post(':id/draft/publish')
  publishDraft(@Param('id') id: string, @CurrentAdmin() admin: AdminIdentity) {
    return this.adminProductsService.publishDraft(id, admin)
  }

  @Delete(':id/draft')
  discardDraft(@Param('id') id: string, @CurrentAdmin() admin: AdminIdentity) {
    return this.adminProductsService.discardDraft(id, admin)
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

  @Post(':id/variants')
  createVariant(
    @Param('id') id: string,
    @Body() dto: CreateAdminProductVariantDto,
    @CurrentAdmin() admin: AdminIdentity,
  ) {
    return this.adminProductsService.createVariant(id, dto, admin)
  }

  @Patch(':id/variants/:variantId')
  updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateAdminProductVariantDto,
    @CurrentAdmin() admin: AdminIdentity,
  ) {
    return this.adminProductsService.updateVariant(id, variantId, dto, admin)
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
