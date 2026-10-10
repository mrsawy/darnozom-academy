import { IsString, IsNotEmpty, IsMongoId, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RenameAiThreadDto {
  @IsMongoId()
  remoteId: string;

  @IsString()
  @IsNotEmpty()
  title: string;
}

export class AiThreadIdDto {
  @IsMongoId()
  remoteId: string;
}

export class ListAiThreadsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class SaveThreadMessagesDto {
  @IsMongoId()
  threadId: string;

  messages: unknown[];
}
