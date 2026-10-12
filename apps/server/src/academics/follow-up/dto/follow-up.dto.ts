import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, IsString, MaxLength, ValidateNested } from 'class-validator';
import { FollowUpDecision } from '@darnozom/shared-types';
import { OptionalNonNull } from '../../common/optional-non-null';

export class FollowUpDto {
  @OptionalNonNull()
  @IsString()
  @MaxLength(2000)
  parentFeedback?: string;

  @OptionalNonNull()
  @IsEnum(FollowUpDecision)
  decision?: FollowUpDecision;
}

export class UpdateFollowUpPayload {
  @IsMongoId()
  id!: string;

  @ValidateNested()
  @Type(() => FollowUpDto)
  data!: FollowUpDto;
}
