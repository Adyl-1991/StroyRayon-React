import { Type } from 'class-transformer'
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator'

export class CreateOrderItemDto {
  @IsOptional()
  @IsString()
  productId?: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsString()
  @IsNotEmpty()
  title: string

  @IsOptional()
  @IsString()
  sku?: string

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity: number

  @IsOptional()
  @IsString()
  unit?: string
}
