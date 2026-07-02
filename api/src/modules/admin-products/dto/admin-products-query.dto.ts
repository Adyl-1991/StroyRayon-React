import { ProductStockStatus } from '@prisma/client'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

const qualityFilters = [
  'missing_image',
  'missing_description',
  'missing_specs',
  'missing_documents',
  'missing_seo',
  'inactive',
  'low_stock',
  'out_of_stock',
]

export class AdminProductsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  catalogPath?: string

  @IsOptional()
  @IsEnum(ProductStockStatus)
  stockStatus?: ProductStockStatus

  @IsOptional()
  @IsIn(qualityFilters)
  quality?: string

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true
    if (value === 'false' || value === false) return false
    return value
  })
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30
}
