import { IsEnum, IsMongoId, ValidateIf } from 'class-validator';
import { CreatePlanSubscriptionDto } from 'src/payment/dto/create-plan-subscription.dto';
import { SubscriptionType } from 'src/utils/enums/subscriptionType.enum';

export class CreateEnrollmentDto {}

/**
 * DTO for initiating any subscription (organization plan or user course).
 * Extends CreatePlanSubscriptionDto; organizationId/planId are required for ORGANIZATION_PLAN,
 * userId/courseId for USER_COURSE.
 */
export class InitiateSubscriptionDto extends CreatePlanSubscriptionDto {
  @IsEnum(SubscriptionType)
  subscriptionType: SubscriptionType;

  @ValidateIf((o: InitiateSubscriptionDto) => o.subscriptionType === SubscriptionType.USER_COURSE)
  @IsMongoId()
  userId: string;

  @ValidateIf((o: InitiateSubscriptionDto) => o.subscriptionType === SubscriptionType.USER_COURSE)
  @IsMongoId()
  courseId: string;
}
