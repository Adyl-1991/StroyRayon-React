import { ProductStockStatus } from '@prisma/client'
import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'
import { AdminProductDocumentDto, AdminProductImageDto, AdminProductSpecDto } from './update-admin-product.dto'

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export class CreateAdminProductDto {
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  catalogNodeId!: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  brandId?: string | null

  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  titleKg!: string

  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  titleRu!: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  slug?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  sku?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1200)
  shortDescriptionKg?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(5000)
  descriptionKg?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(5000)
  descriptionRu?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  seoTitleKg?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  seoDescriptionKg?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  seoTitleRu?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  seoDescriptionRu?: string

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999.99)
  price!: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  stockQuantity!: number

  @Transform(trimString)
  @IsString()
  @MaxLength(40)
  unit!: string

  @IsEnum(ProductStockStatus)
  stockStatus!: ProductStockStatus

  @IsOptional()
  @IsBoolean()
  isActive = false

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  adminNote?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  imageSrc?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  imageAlt?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductSpecDto)
  specs?: AdminProductSpecDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductDocumentDto)
  documents?: AdminProductDocumentDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductImageDto)
  images?: AdminProductImageDto[]
}
