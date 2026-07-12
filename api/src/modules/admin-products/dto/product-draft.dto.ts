import { Type } from 'class-transformer'
import { IsInt, IsObject, IsOptional, Min } from 'class-validator'

export class SaveProductDraftDto {
  @IsObject()
  payload!: Record<string, unknown>

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedVersion?: number
}
