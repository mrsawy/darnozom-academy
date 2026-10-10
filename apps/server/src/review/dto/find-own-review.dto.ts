import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReviewType } from '../enum/reviewType.enum';

export class FindOwnReviewDto {
  @IsEnum(ReviewType)
  reviewType: ReviewType;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  moduleId?: string;

  @IsOptional()
  @IsString()
  contentId?: string;

  @IsOptional()
  @IsString()
  instructorId?: string;

  @IsOptional()
  @IsString()
  reviewedOrganizationId?: string;
}
