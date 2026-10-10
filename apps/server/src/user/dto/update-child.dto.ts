import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateChildDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @Matches(/^\+?\d+$/, { message: 'Phone must contain only digits and may start with +' })
  phone?: string;

  @IsOptional()
  @IsString()
  country?: string;
}
