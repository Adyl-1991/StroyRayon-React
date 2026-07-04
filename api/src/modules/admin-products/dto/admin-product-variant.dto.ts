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
import { AdminProductSpecDto } from './update-admin-product.dto'

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export class CreateAdminProductVariantDto {
  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  titleKg!: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  titleRu?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  sku?: string | null

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999.99)
  price!: number

  @Transform(trimString)
  @IsString()
  @MaxLength(40)
  unit!: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  stockQuantity!: number

  @IsEnum(ProductStockStatus)
  stockStatus!: ProductStockStatus

  @IsOptional()
  @IsBoolean()
  isActive = true

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductSpecDto)
  specs?: AdminProductSpecDto[]
}

export class UpdateAdminProductVariantDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  titleKg?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  titleRu?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  sku?: string | null

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999.99)
  price?: number

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(40)
  unit?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  stockQuantity?: number

  @IsOptional()
  @IsEnum(ProductStockStatus)
  stockStatus?: ProductStockStatus

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductSpecDto)
  specs?: AdminProductSpecDto[]
}
