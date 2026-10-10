import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { RefundRequestStatus } from '../enums/refund-status.enum';

export class RespondRefundDto {
  @IsMongoId()
  bookingId: string;

  @IsEnum([RefundRequestStatus.APPROVED, RefundRequestStatus.REJECTED])
  action: RefundRequestStatus.APPROVED | RefundRequestStatus.REJECTED;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
