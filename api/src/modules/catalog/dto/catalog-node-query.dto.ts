import { IsOptional, IsString } from 'class-validator'

export class CatalogNodeQueryDto {
  @IsOptional()
  @IsString()
  path?: string
}
