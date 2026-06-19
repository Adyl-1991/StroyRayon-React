import { IsBoolean } from 'class-validator'

export class UpdateProductActiveDto {
  @IsBoolean()
  isActive!: boolean
}
