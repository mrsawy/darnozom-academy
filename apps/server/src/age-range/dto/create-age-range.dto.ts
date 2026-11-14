import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateAgeRangeDto {
  @IsString()
  @IsNotEmpty()
  @Transform(trim)
  nameEn: string;

  @IsString()
  @IsNotEmpty()
  @Transform(trim)
  nameAr: string;

  @IsInt()
  @Min(0)
  @Max(120)
  minAge: number;

  /** Omit for an open-ended range (e.g. 18+). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  maxAge?: number | null;
}
