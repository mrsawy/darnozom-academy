import { IsMongoId, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class IssueLiveSessionTokenDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  contentId: string;

  /** Optional for content creators (org hosts); required for enrolled students. */
  @ValidateIf((o: IssueLiveSessionTokenDto) => o.enrollmentId != null && o.enrollmentId !== '')
  @IsString()
  @IsMongoId()
  enrollmentId?: string;
}
