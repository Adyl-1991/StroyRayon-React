import { ProductImageType } from '@prisma/client'
import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export class UpdateProductImageDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(180)
  alt?: string

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
  @IsBoolean()
  isMain?: boolean
}

export class ProductImageOrderDto {
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  id!: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder!: number
}

export class ReorderProductImagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageOrderDto)
  images!: ProductImageOrderDto[]

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  mainImageId?: string
}
