import { IsString, MaxLength } from 'class-validator'

export class UpdateProductNoteDto {
  @IsString()
  @MaxLength(2000)
  note!: string
}
