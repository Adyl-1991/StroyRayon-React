import { Transform } from 'class-transformer'
import { IsString, MaxLength, MinLength } from 'class-validator'

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export class CreateBrandDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string
}

export class UpdateBrandDto extends CreateBrandDto {}
