import { IsArray, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/** Splits CSV query params (`?gradeIds=a,b`) into arrays; leaves arrays untouched. */
const toStringArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const raw = Array.isArray(value) ? value : String(value).split(',');
  return raw.map((v) => String(v).trim()).filter((v) => v.length > 0);
};

/**
 * Validated, flat instructor filter contract shared by the HTTP and NATS entry
 * points. The service turns this into a Mongo `$match`; callers never build
 * Mongo operators themselves.
 */
export class FindInstructorsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsMongoId({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsMongoId({ each: true })
  gradeIds?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsMongoId({ each: true })
  schoolTypeIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
