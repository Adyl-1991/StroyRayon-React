import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto'

export class ProductQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max?: number

  @IsOptional()
  @IsString()
  stock?: string

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsString()
  badge?: string

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsString()
  sort?: string

  @IsOptional()
  @IsString()
  catalogPath?: string
}
