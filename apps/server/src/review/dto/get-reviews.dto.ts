import { IsEnum, IsMongoId, IsOptional, IsNumber, Min, Max, ValidateIf } from 'class-validator';
import { ReviewType } from '../enum/reviewType.enum';
import { Type } from 'class-transformer';

export class GetReviewsDto {
  @IsEnum(ReviewType)
  @IsOptional()
  reviewType?: ReviewType;

  @IsMongoId()
  @IsOptional()
  userId?: string;

  @ValidateIf((o: GetReviewsDto) => o.reviewType === ReviewType.COURSE)
  @IsMongoId()
  @IsOptional()
  courseId?: string;

  @ValidateIf((o: GetReviewsDto) => o.reviewType === ReviewType.INSTRUCTOR)
  @IsMongoId()
  @IsOptional()
  instructorId?: string;

  @ValidateIf((o: GetReviewsDto) => o.reviewType === ReviewType.ORGANIZATION)
  @IsMongoId()
  @IsOptional()
  reviewedOrganizationId?: string;

  @ValidateIf((o: GetReviewsDto) => o.reviewType === ReviewType.MODULE)
  @IsMongoId()
  @IsOptional()
  moduleId?: string;

  @ValidateIf((o: GetReviewsDto) => o.reviewType === ReviewType.CONTENT)
  @IsMongoId()
  @IsOptional()
  contentId?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  @Type(() => Number)
  minRating?: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  @Type(() => Number)
  maxRating?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
