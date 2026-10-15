import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CertificateStatus } from '@darnozom/shared-types';

export class EvaluateGroupCertificatesPayload {
  @IsMongoId()
  id!: string;
}

export class GetCertificatesPayload {
  @IsOptional()
  @IsMongoId()
  groupId?: string;

  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @IsOptional()
  @IsEnum(CertificateStatus)
  status?: CertificateStatus;
}

export class CertificateIdPayload {
  @IsMongoId()
  id!: string;
}

export class UpdateCertificateNamePayload {
  @IsMongoId()
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameAr!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameEn!: string;
}

export class VerifyCertificatePayload {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
