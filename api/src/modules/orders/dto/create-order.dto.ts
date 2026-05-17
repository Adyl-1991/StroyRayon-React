import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsDefined, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator'
import { CreateOrderItemDto } from './create-order-item.dto'

class CreateOrderCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  phone: string

  @IsOptional()
  @IsString()
  region?: string

  @IsOptional()
  @IsString()
  address?: string
}

export class CreateOrderDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateOrderCustomerDto)
  customer: CreateOrderCustomerDto

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[]

  @IsOptional()
  @IsString()
  comment?: string

  @IsOptional()
  @IsString()
  source?: string
}
