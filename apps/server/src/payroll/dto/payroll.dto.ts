import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Currency, TeacherPayModel } from '@darnozom/shared-types';

export class UpsertTeacherPayProfileDto {
  @IsEnum(TeacherPayModel)
  model: TeacherPayModel;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsOptional()
  effectiveFrom?: Date | string;
}

export class GenerateStatementsDto {
  @IsString()
  month: string; // "YYYY-MM"
}

export class AddBonusDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  reason: string;
}

export class MarkPaidDto {
  @IsOptional()
  @IsString()
  paymentReference?: string;
}
