import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateReviewDto } from './create-review.dto';
import { IsMongoId, IsOptional } from 'class-validator';

export class UpdateReviewDto extends PartialType(OmitType(CreateReviewDto, ['reviewType'] as const)) {
  @IsMongoId()
  @IsOptional()
  reviewId?: string;
}
