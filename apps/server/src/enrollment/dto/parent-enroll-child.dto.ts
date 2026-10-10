import { IsMongoId } from 'class-validator';
import { CreateEnrollmentHttpDto } from './create-enrollment.http.dto';

export class ParentEnrollChildDto extends CreateEnrollmentHttpDto {
  @IsMongoId()
  childId: string;
}

export class ParentEnrollChildFreeDto {
  @IsMongoId()
  courseId: string;

  @IsMongoId()
  childId: string;
}
