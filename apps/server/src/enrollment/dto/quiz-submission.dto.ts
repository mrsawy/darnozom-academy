import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, Min, IsMongoId, MaxLength, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

class SubmittedAnswerDto {
  @IsNumber()
  @Min(0)
  questionIndex: number;

  /** Selected option index, or -1 when unanswered (e.g. auto-submit on page unload). */
  @IsNumber()
  @Min(-1)
  selectedOption: number;
}

export class QuizIntegrityEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  type: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  at: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  detail?: string;
}

export class SubmitQuizDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  quizId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmittedAnswerDto)
  answers: SubmittedAnswerDto[];

  @IsNumber()
  @Min(0)
  timeTakenInSeconds?: number;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  studentName?: string;

  @IsNotEmpty()
  @IsMongoId()
  enrollmentId: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => QuizIntegrityEventDto)
  integrityEvents?: QuizIntegrityEventDto[];
}

export class GetQuizAttemptsDto {
  @IsString()
  @IsNotEmpty()
  quizId: string;

  @IsString()
  @IsOptional()
  studentId?: string; // For admin/instructor to check specific student
}
