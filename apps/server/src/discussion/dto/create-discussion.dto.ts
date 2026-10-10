import { IsString, IsNotEmpty, IsEnum, IsOptional, IsMongoId, ValidateIf } from 'class-validator';
import { DiscussionType } from '../enum/discussion-type.enum';

export class CreateDiscussionDto {
  @IsEnum(DiscussionType)
  @IsNotEmpty()
  type: DiscussionType;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsMongoId()
  @IsOptional()
  parentId?: string;

  /** Required for all discussion types (scopes queries and hierarchy checks). */
  @IsMongoId()
  @IsNotEmpty()
  courseId: string;

  @ValidateIf((o: CreateDiscussionDto) => o.type === DiscussionType.MODULE || o.type === DiscussionType.CONTENT)
  @IsMongoId()
  @IsNotEmpty()
  moduleId?: string;

  @ValidateIf((o: CreateDiscussionDto) => o.type === DiscussionType.CONTENT)
  @IsMongoId()
  @IsNotEmpty()
  contentId?: string;
}
