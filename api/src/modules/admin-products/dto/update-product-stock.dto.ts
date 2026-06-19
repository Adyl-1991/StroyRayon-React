import { ProductStockStatus } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'

export class UpdateProductStockDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  quantity?: number

  @IsOptional()
  @IsEnum(ProductStockStatus)
  stockStatus?: ProductStockStatus
}
