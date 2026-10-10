import { IsDateString, IsInt, IsMongoId, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsWithinOneYearOf } from 'src/utils/validators/is-within-one-year-of.validator';

/** Self-service: the logged-in student's history for one course within a [from, to] window (max one year). */
export class GetStudentCourseHistoryDto {
  @IsNotEmpty()
  @IsMongoId()
  courseId: string;

  @IsNotEmpty()
  @IsDateString()
  from: string;

  @IsNotEmpty()
  @IsDateString()
  @IsWithinOneYearOf('from', { message: 'Date range must start on or before "to" and span at most one year' })
  to: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 15;
}

/** Staff: same as the self DTO but targets a specific student (guarded by READ ATTENDANCE). */
export class GetStudentCourseHistoryForStaffDto extends GetStudentCourseHistoryDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;
}
