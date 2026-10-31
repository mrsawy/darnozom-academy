import { IsEnum, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { CoursePaymentStatus } from '../enum/enrollmentStatus.enum';

export class CourseIdPayload {
  @IsMongoId() courseId: string;
}

export class SubmitCoursePaymentPayload {
  @IsMongoId() courseId: string;
  @IsMongoId() paymentMethodConfigId: string;
  @IsEnum(BillingCycle) billingCycle: BillingCycle;
  /** S3 key of the uploaded transfer screenshot. */
  @IsString() @MinLength(1) receiptFileKey: string;
}

export class CoursePaymentIdPayload {
  @IsMongoId() paymentId: string;
}

export class RejectCoursePaymentPayload {
  @IsMongoId() paymentId: string;
  @IsString() @MinLength(1) reason: string;
}

export class ListCoursePaymentsPayload {
  @IsOptional() @IsEnum(CoursePaymentStatus) status?: CoursePaymentStatus;
  @IsOptional() @IsMongoId() courseId?: string;
}
