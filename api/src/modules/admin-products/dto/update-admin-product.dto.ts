import { ProductDocumentType, ProductImageType, ProductStockStatus } from '@prisma/client'
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

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export class AdminProductSpecDto {
  @Transform(trimString)
  @IsString()
  @MaxLength(120)
  key!: string

  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  value!: string
}

export class AdminProductFaqDto {
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  question!: string

  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  answer!: string
}

export class AdminProductDocumentDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  id?: string

  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  title!: string

  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  url!: string

  @IsEnum(ProductDocumentType)
  type!: ProductDocumentType

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number
}

export class AdminProductImageDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  id?: string

  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  src!: string

  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  alt!: string

  @IsOptional()
  @IsEnum(ProductImageType)
  type?: ProductImageType

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  storageKey?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(20)
  storageDriver?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  originalName?: string | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5 * 1024 * 1024)
  size?: number | null
}

export class UpdateAdminProductDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  catalogNodeId?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  brandId?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  titleKg?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  titleRu?: string

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
  shortDescriptionKg?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1200)
  shortDescriptionRu?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(5000)
  descriptionKg?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(5000)
  descriptionRu?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  seoTitleKg?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  seoDescriptionKg?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  seoTitleRu?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  seoDescriptionRu?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(40)
  unit?: string

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(40)
  unitRu?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(120)
  minOrder?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(120)
  minOrderRu?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(240)
  packageInfoKg?: string | null

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(240)
  packageInfoRu?: string | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  adminNote?: string | null

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999.99)
  price?: number

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductSpecDto)
  specs?: AdminProductSpecDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductSpecDto)
  specsRu?: AdminProductSpecDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductFaqDto)
  faqKg?: AdminProductFaqDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductFaqDto)
  faqRu?: AdminProductFaqDto[]

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
