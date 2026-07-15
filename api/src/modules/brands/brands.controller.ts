import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { AdminAuthGuard } from '../auth/admin-auth.guard'
import { AdminIdentity, assertAdminPermission } from '../auth/admin-permissions'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import { BrandsService } from './brands.service'
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto'

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  findMany() {
    return this.brandsService.findMany()
  }
}

@Controller('admin/brands')
@UseGuards(AdminAuthGuard)
export class AdminBrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  create(@Body() dto: CreateBrandDto, @CurrentAdmin() admin: AdminIdentity) {
    assertAdminPermission(admin, 'products:content')
    return this.brandsService.create(dto)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @CurrentAdmin() admin: AdminIdentity,
  ) {
    assertAdminPermission(admin, 'products:content')
    return this.brandsService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentAdmin() admin: AdminIdentity) {
    assertAdminPermission(admin, 'products:content')
    return this.brandsService.remove(id)
  }
}
