import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateSchoolTypeDto {
  @IsString()
  @IsNotEmpty()
  @Transform(trim)
  nameEn: string;

  @IsString()
  @IsNotEmpty()
  @Transform(trim)
  nameAr: string;
}
