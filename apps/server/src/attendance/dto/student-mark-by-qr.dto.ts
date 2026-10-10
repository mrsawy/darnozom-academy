import { IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class StudentMarkByQrDto {
  @IsNotEmpty()
  @IsMongoId()
  courseId: string;

  @IsOptional()
  @IsMongoId()
  enrollmentId?: string;
}
