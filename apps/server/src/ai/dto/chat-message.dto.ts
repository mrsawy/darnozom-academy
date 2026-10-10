import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatRequestDto {
  @IsArray()
  @IsNotEmpty()
  messages: unknown[];

  @IsOptional()
  @IsString()
  threadId?: string;

  @IsOptional()
  @IsMongoId()
  contentId?: string;
}
