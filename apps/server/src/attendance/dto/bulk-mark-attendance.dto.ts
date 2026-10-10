import { Type } from 'class-transformer';
import { IsArray, IsDate, IsMongoId, IsNotEmpty, ValidateNested, IsEnum, IsOptional } from 'class-validator';
import { AttendanceStatus } from '../enum/attendance-status.enum';

export class StudentStatusDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @IsNotEmpty()
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  notes?: string;
}

export class BulkMarkAttendanceDto {
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  date: Date;

  @IsNotEmpty()
  @IsMongoId()
  courseId: string;

  @IsNotEmpty()
  @IsMongoId()
  slotId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentStatusDto)
  students: StudentStatusDto[];
}
