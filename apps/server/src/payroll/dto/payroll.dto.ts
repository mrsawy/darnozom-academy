import { IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Currency, GroupPayModel, PayStatementStatus, TeacherPayModel } from '@darnozom/shared-types';
import { IsRateValidForModel } from '../../utils/validators/is-rate-valid-for-model.validator';

export class TeacherIdPayload {
  @IsNotEmpty()
  @IsString()
  teacherId: string;
}

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

export class UpsertProfilePayload extends UpsertTeacherPayProfileDto {
  @IsNotEmpty()
  @IsString()
  teacherId: string;
}

export class UpsertGroupPayRulePayload {
  @IsMongoId()
  teacherId: string;

  @IsMongoId()
  groupId: string;

  @IsEnum(GroupPayModel)
  model: GroupPayModel;

  @IsNumber()
  @IsRateValidForModel('model')
  rate: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}

export class GroupPayRuleIdPayload {
  @IsMongoId()
  id: string;
}

export class ListGroupPayRulesPayload {
  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @IsOptional()
  @IsMongoId()
  groupId?: string;
}

export class GenerateStatementsPayload {
  @IsNotEmpty()
  @IsString()
  month: string; // "YYYY-MM"
}

export class FindStatementsPayload {
  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsEnum(PayStatementStatus)
  status?: PayStatementStatus;
}

export class StatementIdPayload {
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class AddBonusDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class AddBonusPayload extends AddBonusDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class MarkPaidDto {
  @IsOptional()
  @IsString()
  paymentReference?: string;
}

export class MarkPaidPayload extends MarkPaidDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class DisputeSessionPayload {
  @IsNotEmpty()
  @IsString()
  sessionId: string;

  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class ResolveDisputePayload {
  @IsNotEmpty()
  @IsString()
  sessionId: string;
}
