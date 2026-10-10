import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DiscussionType } from '../enum/discussion-type.enum';

export class GetDiscussionsDto {
  @IsEnum(DiscussionType)
  @IsNotEmpty()
  type: DiscussionType;

  @IsMongoId()
  @IsNotEmpty()
  /** Always the **course** id for every `DiscussionType` (module/content ids use `moduleId` / `contentId`). */
  entityId: string;

  @IsOptional()
  @IsMongoId()
  moduleId?: string;

  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @IsOptional()
  @IsMongoId()
  contentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
